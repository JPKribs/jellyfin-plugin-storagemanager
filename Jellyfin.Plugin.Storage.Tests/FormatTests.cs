using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.Storage.Models;
using Jellyfin.Plugin.Storage.Services;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Configuration;
using MediaBrowser.Model.Entities;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Jellyfin.Plugin.Storage.Tests;

/// <summary>
/// Covers formatting: the name rules, each OS's arguments, and that only a disk listed as unformatted is erased.
/// </summary>
public sealed class FormatTests : IDisposable
{
    private readonly string _folder = Path.Combine(Path.GetTempPath(), "storage-format-" + Guid.NewGuid().ToString("N"));
    private readonly IDiskInventory _inventory = Substitute.For<IDiskInventory>();
    private readonly IDiskFormatter _formatter = Substitute.For<IDiskFormatter>();
    private readonly ILibraryManager _libraries = Substitute.For<ILibraryManager>();
    private readonly StorageServiceTests.FakeMountTable _mounts = new();

    public FormatTests()
    {
        Directory.CreateDirectory(_folder);
        _inventory.GetUnmounted().Returns(new[] { new RawDisk("/dev/sdb", "Samsung SSD 870", 2000) });
        _formatter.FileSystems.Returns(new[] { "ext4", "xfs" });
        _formatter.MountRoot.Returns(_folder);
        _formatter.Format(Arg.Any<RawDisk>(), Arg.Any<string>(), Arg.Any<string>()).Returns(new FormatResult(true, "/mnt/Media"));
        _libraries.GetVirtualFolders().Returns(new List<VirtualFolderInfo> { new() { Name = "Movies", ItemId = "m", Locations = Array.Empty<string>() } });
    }

    public void Dispose() => Directory.Delete(_folder, true);

    [Theory]
    [InlineData("Media", true)]
    [InlineData("Media 2", true)]
    [InlineData("4K_Movies-1", true)]
    [InlineData("", false)]
    [InlineData(" Media", false)]
    [InlineData("TwelveChars1", false)]
    [InlineData("../etc", false)]
    [InlineData("Media/2", false)]
    [InlineData("Média", false)]
    public void ANameIsShortAndPlain(string name, bool valid) => Assert.Equal(valid, FormatNames.IsValid(name));

    [Fact]
    public void ANewDiskMountsUnderItsNameWithDashes() => Assert.Equal("/mnt/Media-2", FormatNames.MountPoint("/mnt", "Media 2"));

    [Fact]
    public void MacOSErasesOnlyAWholeDisk()
    {
        Assert.Equal(new[] { "eraseDisk", "APFS", "Media", "GPT", "disk20" }, MacDiskFormatter.Arguments("disk20", "Media", "apfs"));
        Assert.Equal("ExFAT", MacDiskFormatter.Arguments("disk4", "Media", "exfat")![1]);
        Assert.Null(MacDiskFormatter.Arguments("disk4s1", "Media", "apfs"));
        Assert.Null(MacDiskFormatter.Arguments("/dev/disk4", "Media", "apfs"));
        Assert.Null(MacDiskFormatter.Arguments("disk4", "Media", "ntfs"));
    }

    [Theory]
    [InlineData("Disk 2", 2)]
    [InlineData("Disk 12", 12)]
    [InlineData("Disk -1", null)]
    [InlineData("disk2", null)]
    [InlineData("/dev/sdb", null)]
    public void WindowsReadsTheDiskNumber(string device, int? number) => Assert.Equal(number, WindowsDiskFormatter.DiskNumber(device));

    [Fact]
    public void LinuxMountsANewDiskByUuidWithoutFailingABoot()
    {
        var entry = LinuxDiskFormatter.FstabEntry("1234-abcd", "/mnt/Media", "ext4", 105, 110);
        Assert.Equal("UUID=1234-abcd", entry.FsName);
        Assert.Equal("/mnt/Media", entry.Dir);
        Assert.Contains("nofail", entry.Options, StringComparison.Ordinal);
        Assert.Equal(2, entry.Pass);
        var exfat = LinuxDiskFormatter.FstabEntry("1", "/mnt/x", "exfat", 105, 110);
        Assert.Equal(0, exfat.Pass);
        Assert.EndsWith(",uid=105,gid=110,umask=002", exfat.Options, StringComparison.Ordinal);
        Assert.DoesNotContain("uid=", entry.Options, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ADiskNotListedAsUnformattedIsNeverErased()
    {
        using var formatting = Build(out _);

        var outcome = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sda", Name = "Media", FileSystem = "ext4" }, CancellationToken.None);

        Assert.Equal("ErrorFormatGone", outcome.ErrorKey);
        _formatter.DidNotReceiveWithAnyArgs().Format(default!, default!, default!);
    }

    [Theory]
    [InlineData("../Media", "ext4", null, "ErrorFormatName")]
    [InlineData("Media", "ntfs", null, "ErrorFormatFileSystem")]
    [InlineData("Media", "ext4", "Shows", "ErrorFormatLibrary")]
    public async Task ABadRequestIsRefusedBeforeAnythingIsTouched(string name, string fileSystem, string? library, string key)
    {
        using var formatting = Build(out _);

        var outcome = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = name, FileSystem = fileSystem, Library = library }, CancellationToken.None);

        Assert.Equal(key, outcome.ErrorKey);
        _formatter.DidNotReceiveWithAnyArgs().Format(default!, default!, default!);
    }

    [Fact]
    public async Task AFolderAlreadyHoldingFilesIsNotMountedOver()
    {
        Directory.CreateDirectory(Path.Combine(_folder, "Media"));
        await File.WriteAllTextAsync(Path.Combine(_folder, "Media", "keep.txt"), "x");
        using var formatting = Build(out _);

        var outcome = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = "Media", FileSystem = "ext4" }, CancellationToken.None);

        Assert.Equal("ErrorFormatTaken", outcome.ErrorKey);
    }

    [Fact]
    public async Task AFormattedDiskIsAddedToItsLibraryAndRecorded()
    {
        using var formatting = Build(out var log);

        var outcome = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = "Media", FileSystem = "ext4", Library = "Movies" }, CancellationToken.None);

        Assert.True(outcome.Formatted);
        Assert.Equal("/mnt/Media", outcome.MountPoint);
        _formatter.Received(1).Format(Arg.Is<RawDisk>(d => d.Device == "/dev/sdb"), "Media", "ext4");
        _libraries.Received(1).AddMediaPath("Movies", Arg.Is<MediaPathInfo>(p => p.Path == "/mnt/Media"));
        var entry = Assert.Single(TestServices.Entries(log), e => e.Name == "Disk formatted");
        Assert.Equal("Formatted Samsung SSD 870 (/dev/sdb) as EXT4 at /mnt/Media and added it to Movies", entry.ShortOverview);
    }

    [Fact]
    public async Task AFailedFormatIsRecordedWithWhatTheOsSaid()
    {
        _formatter.Format(Arg.Any<RawDisk>(), Arg.Any<string>(), Arg.Any<string>()).Returns(FormatResult.Failed("Jellyfin isn't allowed to manage disks"));
        using var formatting = Build(out var log);

        var outcome = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = "Media", FileSystem = "ext4" }, CancellationToken.None);

        Assert.False(outcome.Formatted);
        var entry = Assert.Single(TestServices.Entries(log), e => e.Name == "Disk not formatted");
        Assert.Equal("Samsung SSD 870 (/dev/sdb) couldn't be formatted: Jellyfin isn't allowed to manage disks", entry.ShortOverview);
    }

    [Fact]
    public async Task ADiskHoldingDataIsErasedOnlyWhenAskedTo()
    {
        _inventory.GetUnmounted().Returns(new[] { new RawDisk("/dev/sdb", "Flash", 2000, new[] { "Debian 13 (iso9660)" }) });
        using var formatting = Build(out _);

        var refused = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = "Media", FileSystem = "ext4" }, CancellationToken.None);
        _formatter.DidNotReceiveWithAnyArgs().Format(default!, default!, default!);
        var erased = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = "Media", FileSystem = "ext4", Erase = true }, CancellationToken.None);

        Assert.Equal("ErrorFormatHasData", refused.ErrorKey);
        Assert.True(erased.Formatted);
    }

    private DiskFormatting Build(out MediaBrowser.Model.Activity.IActivityManager log)
    {
        var activity = TestServices.Activity(out log);
        var storage = StorageServiceTests.Build(_folder, _mounts, new TestServices.Settings(), activity);
        return new DiskFormatting(_inventory, _formatter, _mounts, new VolumeProbe(), new LibraryFolders(_libraries, Substitute.For<ILibraryMonitor>(), NullLogger<LibraryFolders>.Instance), activity, storage, NullLogger<DiskFormatting>.Instance);
    }

    [Fact]
    public void MacOSKeepsSpacesInTheFolderName() => Assert.Equal("/Volumes/Media 2", FormatNames.MountPoint("/Volumes", "Media 2", false));

    [Fact]
    public async Task AFolderAnotherDiskMountsAtIsNotTaken()
    {
        _inventory.HasFstabEntry(System.IO.Path.Combine(_folder, "Media")).Returns(true);
        using var formatting = Build(out _);

        var outcome = await formatting.FormatAsync(new FormatRequest { Device = "/dev/sdb", Name = "Media", FileSystem = "ext4" }, CancellationToken.None);

        Assert.Equal("ErrorFormatTaken", outcome.ErrorKey);
        _formatter.DidNotReceiveWithAnyArgs().Format(default!, default!, default!);
    }
}
