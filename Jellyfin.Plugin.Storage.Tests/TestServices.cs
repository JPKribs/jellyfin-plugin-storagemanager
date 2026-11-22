using System;
using System.Collections.Generic;
using System.Linq;
using Jellyfin.Database.Implementations.Entities;
using Jellyfin.Plugin.Storage.Configuration;
using Jellyfin.Plugin.Storage.Models;
using Jellyfin.Plugin.Storage.Services;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Model.Activity;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Jellyfin.Plugin.Storage.Tests;

/// <summary>
/// Shared stand-ins: an activity log that keeps what it is given, settings a test sets, and disks to feed the rules.
/// </summary>
internal static class TestServices
{
    /// <summary>
    /// Builds an activity writer over a stand-in activity log, in US English.
    /// </summary>
    /// <param name="manager">The stand-in activity log, to read the entries back.</param>
    /// <returns>The writer.</returns>
    public static StorageActivity Activity(out IActivityManager manager)
    {
        manager = Substitute.For<IActivityManager>();
        return new StorageActivity(new ActivityLogger(manager, NullLogger<ActivityLogger>.Instance), () => "en-us");
    }

    /// <summary>
    /// Reads every entry written to a stand-in activity log.
    /// </summary>
    /// <param name="manager">The stand-in activity log.</param>
    /// <returns>The entries, in the order they were written.</returns>
    public static List<ActivityLog> Entries(IActivityManager manager)
        => manager.ReceivedCalls()
            .Where(c => c.GetMethodInfo().Name == nameof(IActivityManager.CreateAsync))
            .Select(c => (ActivityLog)c.GetArguments()[0]!)
            .ToList();

    /// <summary>
    /// Builds a disk.
    /// </summary>
    /// <param name="mount">Its mount point.</param>
    /// <param name="state">Whether it can be read.</param>
    /// <param name="usedPercent">How full it is, when mounted.</param>
    /// <returns>The disk.</returns>
    public static DiskInfo Disk(string mount, DiskState state = DiskState.Available, double usedPercent = 50)
    {
        const long Total = 1000L * 1024 * 1024 * 1024;
        return new DiskInfo
        {
            MountPoint = mount,
            Name = MountPaths.DisplayName(mount, null),
            State = state,
            TotalBytes = state == DiskState.Available ? Total : null,
            FreeBytes = state == DiskState.Available ? (long)(Total * (100 - usedPercent) / 100) : null
        };
    }

    /// <summary>
    /// Settings a test can change.
    /// </summary>
    public sealed class Settings : StorageSettings
    {
        /// <summary>Gets the settings the test set.</summary>
        public PluginConfiguration Value { get; } = new();

        /// <inheritdoc />
        public override PluginConfiguration Current => Value;
    }
}
