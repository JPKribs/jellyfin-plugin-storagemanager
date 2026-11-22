using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Jellyfin.Plugin.Storage.Models;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Controller.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Storage.Services;

/// <summary>
/// Writes disk changes and blocked scans to Jellyfin's activity log, in the server's display language. The changes
/// of one check are summed into one entry per kind, so a NAS going down with three shares writes one entry.
/// </summary>
public sealed class StorageActivity
{
    private readonly ActivityLogger _logger;
    private readonly Func<string?> _language;

    /// <summary>
    /// Initializes a new instance of the <see cref="StorageActivity"/> class, writing in the server's display language.
    /// </summary>
    /// <param name="logger">The activity log writer.</param>
    /// <param name="config">The server configuration, read for its display language each time an entry is written.</param>
    public StorageActivity(ActivityLogger logger, IServerConfigurationManager config)
        : this(logger, () => BaseTranslations.ServerLanguage(config))
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="StorageActivity"/> class with a given language, for tests.
    /// </summary>
    /// <param name="logger">The activity log writer.</param>
    /// <param name="language">Gives the language entries are written in.</param>
    public StorageActivity(ActivityLogger logger, Func<string?> language)
    {
        _logger = logger;
        _language = language;
    }

    /// <summary>
    /// Writes one entry for each kind of change in a check.
    /// </summary>
    /// <param name="events">The changes the check found.</param>
    public void Record(IReadOnlyList<DiskEvent> events)
    {
        ArgumentNullException.ThrowIfNull(events);
        var language = _language();
        foreach (var group in events.GroupBy(e => e.Kind))
        {
            var list = group.ToList();
            var (type, nameOne, nameMany, severity) = group.Key switch
            {
                DiskEventKind.WentMissing => ("Storage.DiskMissing", TranslationKeys.ActivityNameDiskMissing, TranslationKeys.ActivityNameDisksMissing, LogLevel.Error),
                DiskEventKind.BecameUnresponsive => ("Storage.DiskUnresponsive", TranslationKeys.ActivityNameDiskUnresponsive, TranslationKeys.ActivityNameDisksUnresponsive, LogLevel.Warning),
                DiskEventKind.Returned => ("Storage.DiskBack", TranslationKeys.ActivityNameDiskBack, TranslationKeys.ActivityNameDisksBack, LogLevel.Information),
                DiskEventKind.Failing => ("Storage.DiskFailing", TranslationKeys.ActivityNameDiskFailing, TranslationKeys.ActivityNameDisksFailing, LogLevel.Error),
                DiskEventKind.Hot => ("Storage.DiskHot", TranslationKeys.ActivityNameDiskHot, TranslationKeys.ActivityNameDisksHot, LogLevel.Warning),
                DiskEventKind.Worn => ("Storage.DiskWorn", TranslationKeys.ActivityNameDiskWorn, TranslationKeys.ActivityNameDisksWorn, LogLevel.Warning),
                DiskEventKind.Low => ("Storage.DiskLow", TranslationKeys.ActivityNameDiskLow, TranslationKeys.ActivityNameDisksLow, LogLevel.Warning),
                _ => ("Storage.DiskFull", TranslationKeys.ActivityNameDiskFull, TranslationKeys.ActivityNameDisksFull, LogLevel.Error)
            };

            var name = BaseTranslations.Get(list.Count == 1 ? nameOne : nameMany, language);
            _logger.Log(name, type, ActivityText.Sentence(Overview(group.Key, list, language)), severity);
        }
    }

    /// <summary>
    /// Writes the entry for a library scan the scan guard stopped.
    /// </summary>
    /// <param name="blockers">The disks that blocked it.</param>
    public void ScanBlocked(IReadOnlyList<DiskInfo> blockers)
    {
        ArgumentNullException.ThrowIfNull(blockers);
        var language = _language();
        _logger.Log(
            BaseTranslations.Get(TranslationKeys.ActivityNameScanBlocked, language),
            "Storage.ScanBlocked",
            ActivityText.Sentence(BaseTranslations.Format(TranslationKeys.ActivityScanBlocked, language, Names(blockers, language))),
            LogLevel.Warning);
    }

    /// <summary>
    /// Writes the entry for disks mounted again, one entry for all of them.
    /// </summary>
    /// <param name="disks">The disks mounted again.</param>
    public void Remounted(IReadOnlyList<DiskInfo> disks)
    {
        ArgumentNullException.ThrowIfNull(disks);
        if (disks.Count == 0)
        {
            return;
        }

        var language = _language();
        var one = disks.Count == 1;
        _logger.Log(
            BaseTranslations.Get(one ? TranslationKeys.ActivityNameDiskRemounted : TranslationKeys.ActivityNameDisksRemounted, language),
            "Storage.DiskRemounted",
            ActivityText.Sentence(BaseTranslations.Format(one ? TranslationKeys.ActivityDiskRemounted : TranslationKeys.ActivityDisksRemounted, language, Names(disks, language))),
            LogLevel.Information);
    }

    /// <summary>
    /// Writes the entry for disks whose first try to mount them again failed, one entry for all of them. Later
    /// tries that fail are not written, so a disk that stays gone writes once.
    /// </summary>
    /// <param name="failed">The disks, each with what came of its try.</param>
    public void NotRemounted(IReadOnlyList<(DiskInfo Disk, RemountResult Result)> failed)
    {
        ArgumentNullException.ThrowIfNull(failed);
        if (failed.Count == 0)
        {
            return;
        }

        var language = _language();
        var one = failed.Count == 1;
        var overview = one
            ? BaseTranslations.Format(TranslationKeys.ActivityDiskNotRemounted, language, Label(failed[0].Disk, language), Reason(failed[0].Result, language))
            : BaseTranslations.Format(TranslationKeys.ActivityDisksNotRemounted, language, Names(failed.Select(f => f.Disk), language));
        _logger.Log(
            BaseTranslations.Get(one ? TranslationKeys.ActivityNameDiskNotRemounted : TranslationKeys.ActivityNameDisksNotRemounted, language),
            "Storage.DiskNotRemounted",
            ActivityText.Sentence(overview),
            LogLevel.Error);
    }

    /// <summary>
    /// Writes the entry for a disk formatted and mounted.
    /// </summary>
    /// <param name="disk">The disk, as it was listed before.</param>
    /// <param name="fileSystem">The file system it was formatted as.</param>
    /// <param name="mountPoint">Where it was mounted, when known.</param>
    /// <param name="library">The library it was added to, or <c>null</c>.</param>
    public void Formatted(RawDisk disk, string fileSystem, string? mountPoint, string? library)
    {
        ArgumentNullException.ThrowIfNull(disk);
        var language = _language();
        var at = mountPoint ?? disk.Device;
        var overview = library is null
            ? BaseTranslations.Format(TranslationKeys.ActivityDiskFormatted, language, DiskName(disk), FileSystemName(fileSystem), at)
            : BaseTranslations.Format(TranslationKeys.ActivityDiskFormattedLibrary, language, DiskName(disk), FileSystemName(fileSystem), at, library);
        _logger.Log(BaseTranslations.Get(TranslationKeys.ActivityNameDiskFormatted, language), "Storage.DiskFormatted", ActivityText.Sentence(overview), LogLevel.Information);
    }

    /// <summary>
    /// Writes the entry for a folder made on a disk.
    /// </summary>
    /// <param name="path">The folder.</param>
    /// <param name="library">The library it was added to, or <c>null</c>.</param>
    public void FolderCreated(string path, string? library)
    {
        var language = _language();
        var overview = library is null
            ? BaseTranslations.Format(TranslationKeys.ActivityFolderCreated, language, path)
            : BaseTranslations.Format(TranslationKeys.ActivityFolderCreatedLibrary, language, path, library);
        _logger.Log(BaseTranslations.Get(TranslationKeys.ActivityNameFolderCreated, language), "Storage.FolderCreated", ActivityText.Sentence(overview), LogLevel.Information);
    }

    /// <summary>
    /// Writes the entry for a disk the OS could not format.
    /// </summary>
    /// <param name="disk">The disk.</param>
    /// <param name="error">What the OS said.</param>
    public void NotFormatted(RawDisk disk, string error)
    {
        ArgumentNullException.ThrowIfNull(disk);
        var language = _language();
        _logger.Log(
            BaseTranslations.Get(TranslationKeys.ActivityNameDiskNotFormatted, language),
            "Storage.DiskNotFormatted",
            ActivityText.Sentence(BaseTranslations.Format(TranslationKeys.ActivityDiskNotFormatted, language, DiskName(disk), error.TrimEnd('.'))),
            LogLevel.Error);
    }

    /// <summary>
    /// Names an unformatted disk by its model and device, such as Samsung SSD 870 (/dev/sdb).
    /// </summary>
    /// <param name="disk">The disk.</param>
    /// <returns>The name.</returns>
    public static string DiskName(RawDisk disk)
    {
        ArgumentNullException.ThrowIfNull(disk);
        return string.IsNullOrEmpty(disk.Model) ? disk.Device : disk.Model + " (" + disk.Device + ")";
    }

    /// <summary>
    /// Spells a file system as its makers do, such as exFAT or APFS.
    /// </summary>
    /// <param name="fileSystem">The file system as the plugin names it, such as exfat.</param>
    /// <returns>The name.</returns>
    public static string FileSystemName(string fileSystem) => fileSystem switch
    {
        "exfat" => "exFAT",
        "btrfs" => "Btrfs",
        _ => (fileSystem ?? string.Empty).ToUpperInvariant()
    };

    /// <summary>
    /// Says why a disk could not be mounted again.
    /// </summary>
    /// <param name="result">What came of the try.</param>
    /// <param name="language">The language.</param>
    /// <returns>The reason.</returns>
    public static string Reason(RemountResult result, string? language)
    {
        ArgumentNullException.ThrowIfNull(result);
        return result.Failure switch
        {
            RemountFailure.Denied => BaseTranslations.Get(TranslationKeys.RemountDenied, language),
            RemountFailure.SignIn => BaseTranslations.Get(TranslationKeys.RemountSignIn, language),
            RemountFailure.Unreachable => BaseTranslations.Get(TranslationKeys.RemountUnreachable, language),
            RemountFailure.NotMounted => BaseTranslations.Get(TranslationKeys.RemountNotMounted, language),
            _ => BaseTranslations.Format(TranslationKeys.RemountError, language, result.Code.ToString(CultureInfo.InvariantCulture))
        };
    }

    /// <summary>
    /// Names a disk for an overview: its name and mount point, or the mount point alone when they are the same. The
    /// system disk is named as such.
    /// </summary>
    /// <param name="disk">The disk.</param>
    /// <param name="language">The language.</param>
    /// <returns>The name.</returns>
    public static string Label(DiskInfo disk, string? language)
    {
        ArgumentNullException.ThrowIfNull(disk);

        // The system disk is called that, as on the Storage tab, rather than / or a volume label.
        if (disk.IsSystem)
        {
            return BaseTranslations.Format(TranslationKeys.ActivityDiskAt, language, BaseTranslations.Get(TranslationKeys.ActivitySystemDisk, language), disk.MountPoint);
        }

        return string.Equals(disk.Name, disk.MountPoint, StringComparison.Ordinal)
            ? disk.MountPoint
            : BaseTranslations.Format(TranslationKeys.ActivityDiskAt, language, disk.Name, disk.MountPoint);
    }

    /// <summary>
    /// Says how long a disk was away, in minutes, hours, or days.
    /// </summary>
    /// <param name="away">How long.</param>
    /// <param name="language">The language.</param>
    /// <returns>The length.</returns>
    public static string Duration(TimeSpan away, string? language)
    {
        if (away.TotalHours < 1)
        {
            var minutes = Math.Max(1, (int)Math.Round(away.TotalMinutes));
            return minutes == 1 ? BaseTranslations.Get(TranslationKeys.DurationMinute, language) : BaseTranslations.Format(TranslationKeys.DurationMinutes, language, minutes);
        }

        if (away.TotalHours < 48)
        {
            var hours = (int)Math.Round(away.TotalHours);
            return hours == 1 ? BaseTranslations.Get(TranslationKeys.DurationHour, language) : BaseTranslations.Format(TranslationKeys.DurationHours, language, hours);
        }

        return BaseTranslations.Format(TranslationKeys.DurationDays, language, (int)Math.Round(away.TotalDays));
    }

    private static string Overview(DiskEventKind kind, List<DiskEvent> events, string? language)
    {
        var disks = events.Select(e => e.Disk).ToList();
        if (events.Count > 1)
        {
            var many = kind switch
            {
                DiskEventKind.WentMissing => TranslationKeys.ActivityDisksMissing,
                DiskEventKind.BecameUnresponsive => TranslationKeys.ActivityDisksUnresponsive,
                DiskEventKind.Returned => TranslationKeys.ActivityDisksBack,
                DiskEventKind.Failing => TranslationKeys.ActivityDisksFailing,
                DiskEventKind.Hot => TranslationKeys.ActivityDisksHot,
                DiskEventKind.Worn => TranslationKeys.ActivityDisksWorn,
                DiskEventKind.Low => TranslationKeys.ActivityDisksLow,
                _ => TranslationKeys.ActivityDisksFull
            };
            return BaseTranslations.Format(many, language, Names(disks, language));
        }

        var one = events[0];
        var label = Label(one.Disk, language);
        return kind switch
        {
            DiskEventKind.WentMissing => BaseTranslations.Format(TranslationKeys.ActivityDiskMissing, language, label),
            DiskEventKind.BecameUnresponsive => BaseTranslations.Format(TranslationKeys.ActivityDiskUnresponsive, language, label),
            DiskEventKind.Failing => BaseTranslations.Format(TranslationKeys.ActivityDiskFailing, language, label),
            DiskEventKind.Hot => BaseTranslations.Format(TranslationKeys.ActivityDiskHot, language, label, (one.Disk.TemperatureCelsius ?? 0).ToString(CultureInfo.InvariantCulture)),
            DiskEventKind.Worn => BaseTranslations.Format(TranslationKeys.ActivityDiskWorn, language, label, (one.Disk.WearPercent ?? 0).ToString(CultureInfo.InvariantCulture)),
            DiskEventKind.Returned => one.Away is { } away
                ? BaseTranslations.Format(TranslationKeys.ActivityDiskBackAfter, language, label, Duration(away, language))
                : BaseTranslations.Format(TranslationKeys.ActivityDiskBack, language, label),
            _ => BaseTranslations.Format(TranslationKeys.ActivityDiskFullness, language, label, Percent(one.Disk), FormatUtilities.FormatBytes(one.Disk.FreeBytes ?? 0))
        };
    }

    private static string Names(IEnumerable<DiskInfo> disks, string? language)
        => string.Join(", ", disks.Select(d => Label(d, language)));

    private static string Percent(DiskInfo disk)
    {
        var total = disk.TotalBytes ?? 0;
        var used = total > 0 ? (total - (disk.FreeBytes ?? 0)) * 100d / total : 0;
        return Math.Round(used).ToString(CultureInfo.InvariantCulture);
    }
}
