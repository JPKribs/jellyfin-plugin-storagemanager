using System;
using Jellyfin.Plugin.Storage.Services;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Jellyfin.Plugin.Storage;

/// <summary>
/// Registers plugin services with the Jellyfin DI container.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // Writes disk events to Jellyfin's activity log, which is where the dashboard surfaces plugin events to
        // administrators.
        serviceCollection.AddActivityLogger();

        serviceCollection.TryAddSingleton(TimeProvider.System);
        serviceCollection.AddSingleton<IMountTable, DriveMountTable>();

        // Finds disks with no file system and reads SMART data. Each OS reports both its own way.
        if (OperatingSystem.IsLinux())
        {
            serviceCollection.AddSingleton<IDiskInventory, LinuxDiskInventory>();
            serviceCollection.AddSingleton<ISmartReader, LinuxSmartReader>();
            serviceCollection.AddSingleton<IRemounter, LinuxRemounter>();
            serviceCollection.AddSingleton<IDiskFormatter, LinuxDiskFormatter>();
        }
        else if (OperatingSystem.IsMacOS())
        {
            serviceCollection.AddSingleton<IDiskInventory, MacDiskInventory>();
            serviceCollection.AddSingleton<ISmartReader, MacSmartReader>();
            serviceCollection.AddSingleton<IRemounter, MacRemounter>();
            serviceCollection.AddSingleton<IDiskFormatter, MacDiskFormatter>();
        }
        else if (OperatingSystem.IsWindows())
        {
            serviceCollection.AddSingleton<IDiskInventory, WindowsDiskInventory>();
            serviceCollection.AddSingleton<ISmartReader, WindowsSmartReader>();
            serviceCollection.AddSingleton<IRemounter, WindowsRemounter>();
            serviceCollection.AddSingleton<IDiskFormatter, WindowsDiskFormatter>();
        }
        else
        {
            serviceCollection.AddSingleton<IDiskInventory, NoDiskInventory>();
            serviceCollection.AddSingleton<ISmartReader, NoSmartReader>();
            serviceCollection.AddSingleton<IRemounter, NoRemounter>();
            serviceCollection.AddSingleton<IDiskFormatter, NoDiskFormatter>();
        }

        serviceCollection.AddSingleton<VolumeProbe>();
        serviceCollection.AddSingleton<StorageSettings>();
        serviceCollection.AddSingleton<StorageActivity>();
        serviceCollection.AddSingleton<MonitorMuter>();
        serviceCollection.AddSingleton<JellyfinFolders>();
        serviceCollection.AddSingleton<StorageService>();
        serviceCollection.AddSingleton<LibraryFolders>();
        serviceCollection.AddSingleton<DiskFormatting>();
        serviceCollection.AddSingleton<FolderCreator>();

        // Blocks a library scan while a disk it would scan is missing.
        serviceCollection.AddHostedService<ScanGuard>();
    }
}
