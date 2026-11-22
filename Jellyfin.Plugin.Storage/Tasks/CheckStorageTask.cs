using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.Storage.Services;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Tasks;

namespace Jellyfin.Plugin.Storage.Tasks;

/// <summary>
/// Checks every disk on a schedule, every 30 minutes and at startup by default, so changes reach the activity log
/// without anyone opening the Storage tab.
/// </summary>
public sealed class CheckStorageTask : PluginScheduledTask
{
    private readonly StorageService _storage;
    private readonly IServerConfigurationManager _config;

    /// <summary>
    /// Initializes a new instance of the <see cref="CheckStorageTask"/> class.
    /// </summary>
    /// <param name="storage">Checks the disks.</param>
    /// <param name="config">The server configuration, read for its display language.</param>
    public CheckStorageTask(StorageService storage, IServerConfigurationManager config)
    {
        _storage = storage;
        _config = config;
    }

    /// <inheritdoc />
    public override string Name => BaseTranslations.Get(TranslationKeys.TaskCheckStorage, BaseTranslations.ServerLanguage(_config));

    /// <inheritdoc />
    public override string Key => "StorageCheck";

    /// <inheritdoc />
    public override string Description => BaseTranslations.Get(TranslationKeys.TaskCheckStorageDescription, BaseTranslations.ServerLanguage(_config));

    /// <inheritdoc />
    public override string Category => "Storage";

    /// <inheritdoc />
    public override async Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(progress);
        await _storage.CheckAsync(cancellationToken).ConfigureAwait(false);
        progress.Report(100);
    }

    /// <inheritdoc />
    public override IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        yield return TaskTriggers.EveryInterval(TimeSpan.FromMinutes(30));
        yield return TaskTriggers.OnStartup();
    }
}
