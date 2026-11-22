using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Jellyfin.Plugin.Storage.Models;
using Jellyfin.Plugin.Storage.Services;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;
using static Jellyfin.Plugin.Storage.Tests.TestServices;

namespace Jellyfin.Plugin.Storage.Tests;

/// <summary>
/// Covers which disks block a library scan in each mode, and that the guard cancels only the library scan.
/// </summary>
public class ScanGuardTests
{
    private static DiskInfo Unsafe(string mount)
    {
        var disk = Disk(mount, DiskState.Missing);
        disk.ScanSafe = false;
        return disk;
    }

    [Fact]
    public void AffectedBlocksOnlyForADiskJellyfinWouldScan()
    {
        var disks = new[] { Disk("/mnt/a"), Disk("/mnt/b", DiskState.Missing), Unsafe("/mnt/c") };

        var blockers = ScanGuardPolicy.Blockers(ScanGuardMode.Affected, disks);

        Assert.Equal(new[] { "/mnt/c" }, blockers.Select(d => d.MountPoint));
    }

    [Fact]
    public void AllBlocksForAnyDiskThatCannotBeRead()
    {
        var disks = new[] { Disk("/mnt/a"), Disk("/mnt/b", DiskState.Missing), Disk("/mnt/c", DiskState.Unresponsive) };

        Assert.Equal(2, ScanGuardPolicy.Blockers(ScanGuardMode.All, disks).Count);
    }

    [Fact]
    public void OffNeverBlocks()
        => Assert.Empty(ScanGuardPolicy.Blockers(ScanGuardMode.Off, new[] { Unsafe("/mnt/c") }));

    [Fact]
    public async Task TheGuardCancelsALibraryScanAndRecordsIt()
    {
        using var harness = new Harness();
        harness.Mounts.Mounted = false;
        await harness.Storage.CheckAsync(default);

        var worker = Worker(ScanGuard.LibraryScanKey);
        var blockers = harness.Guard.Guard(worker);

        Assert.Single(blockers);
        harness.Tasks.Received(1).Cancel(worker);
        Assert.Contains(Entries(harness.ActivityLog), e => e.Name == "Library scan blocked");
    }

    [Fact]
    public void TheGuardLetsOtherTasksRun()
    {
        using var harness = new Harness();
        harness.Mounts.Mounted = false;

        var worker = Worker("CleanActivityLog");

        Assert.Empty(harness.Guard.Guard(worker));
        harness.Tasks.DidNotReceiveWithAnyArgs().Cancel(default!);
    }

    private static IScheduledTaskWorker Worker(string key)
    {
        var task = Substitute.For<IScheduledTask>();
        task.Key.Returns(key);
        var worker = Substitute.For<IScheduledTaskWorker>();
        worker.ScheduledTask.Returns(task);
        return worker;
    }

    // A missing disk whose folder still holds leftover files, which Jellyfin would scan and empty.
    private sealed class Harness : IDisposable
    {
        private readonly string _folder = Path.Combine(Path.GetTempPath(), "storage-guard-" + Guid.NewGuid().ToString("N"));

        public Harness()
        {
            Directory.CreateDirectory(_folder);
            Activity = Activity(out var log);
            ActivityLog = log;
            Storage = StorageServiceTests.Build(_folder, Mounts, Settings, Activity);
            Guard = new ScanGuard(Tasks, Storage, Settings, Activity, NullLogger<ScanGuard>.Instance);
            Storage.CheckAsync(default).GetAwaiter().GetResult();
        }

        public StorageServiceTests.FakeMountTable Mounts { get; } = new() { LeftoverFiles = true };

        public Settings Settings { get; } = new();

        public StorageActivity Activity { get; }

        public MediaBrowser.Model.Activity.IActivityManager ActivityLog { get; }

        public ITaskManager Tasks { get; } = Substitute.For<ITaskManager>();

        public StorageService Storage { get; }

        public ScanGuard Guard { get; }

        public void Dispose()
        {
            Storage.Dispose();
            Directory.Delete(_folder, true);
        }
    }
}
