using Jellyfin.Plugin.Storage.Configuration;

namespace Jellyfin.Plugin.Storage.Services;

/// <summary>
/// Gives the plugin's current settings, so a test can give its own.
/// </summary>
public class StorageSettings
{
    /// <summary>Gets the settings as saved, or the defaults before the plugin has loaded.</summary>
    public virtual PluginConfiguration Current => Plugin.Instance?.Configuration ?? new PluginConfiguration();
}
