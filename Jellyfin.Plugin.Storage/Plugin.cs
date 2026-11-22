using System;
using System.Collections.Generic;
using Jellyfin.Plugin.Storage.Configuration;
using Jellyfin.Plugin.Storage.Services;
using JPKribs.Jellyfin.Base;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Storage;

/// <summary>
/// Main plugin entry point for Storage.
/// </summary>
public class Plugin : PluginBase<Plugin, PluginConfiguration>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">The application paths.</param>
    /// <param name="xmlSerializer">The XML serializer.</param>
    /// <param name="logger">The logger.</param>
    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer,
        ILogger<Plugin> logger)
        : base(applicationPaths, xmlSerializer)
    {
        ArgumentNullException.ThrowIfNull(logger);
        logger.LogInformation("Storage plugin initialized");
    }

    /// <inheritdoc />
    public override string Name => "Storage";

    /// <inheritdoc />
    public override Guid Id => Guid.Parse("0d1ca63a-1bd8-45b2-882a-9aaa51b456c3");

    /// <inheritdoc />
    public override string Description => "Watch the disks and shares your libraries use.";

    /// <summary>
    /// Keeps the Error alert past the Warning alert, whichever client saves the settings.
    /// </summary>
    /// <param name="incoming">The settings being saved.</param>
    /// <param name="stored">The settings in effect.</param>
    protected override void OnConfigurationSaving(PluginConfiguration incoming, PluginConfiguration stored)
    {
        ArgumentNullException.ThrowIfNull(incoming);
        AlertOrder.Normalize(incoming);
    }

    /// <inheritdoc />
    public override IEnumerable<PluginPageInfo> GetPages()
    {
        var ns = typeof(Plugin).Namespace;

        // Tab 1: Storage (the dashboard menu entry).
        yield return new PluginPageInfo
        {
            Name = "storage_storage",
            EmbeddedResourcePath = $"{ns}.Web.storage_storage.html",
            MenuSection = "server",
            DisplayName = "Storage",
            EnableInMainMenu = true,
            MenuIcon = "storage"
        };

        yield return new PluginPageInfo
        {
            Name = "storage_storage.js",
            EmbeddedResourcePath = $"{ns}.Web.storage_storage.js"
        };

        // Tab 2: Settings.
        yield return new PluginPageInfo
        {
            Name = "storage_settings",
            EmbeddedResourcePath = $"{ns}.Web.storage_settings.html"
        };

        yield return new PluginPageInfo
        {
            Name = "storage_settings.js",
            EmbeddedResourcePath = $"{ns}.Web.storage_settings.js"
        };

        yield return new PluginPageInfo
        {
            Name = "storage_common.js",
            EmbeddedResourcePath = $"{ns}.Web.storage_common.js"
        };

        yield return new PluginPageInfo
        {
            Name = "storage_shared.css",
            EmbeddedResourcePath = $"{ns}.Web.storage_shared.css"
        };

        // Shared base CSS and JS compiled in from the JPKribs.Jellyfin.Base package.
        foreach (var page in GetSharedPages("storage"))
        {
            yield return page;
        }
    }
}
