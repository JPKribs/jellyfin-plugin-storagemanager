using Jellyfin.Plugin.Storage.Models;

namespace Jellyfin.Plugin.Storage.Services;

/// <summary>
/// The SMART reader on an OS the plugin has no reader for. Every disk's health is unknown.
/// </summary>
public sealed class NoSmartReader : ISmartReader
{
    /// <inheritdoc />
    public SmartReading? Read(string mountPoint) => null;
}
