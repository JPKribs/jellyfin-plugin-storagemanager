using System;
using System.Collections.Generic;
using Jellyfin.Plugin.Storage.Models;

namespace Jellyfin.Plugin.Storage.Services;

/// <summary>
/// The disk inventory on an OS the plugin has no reader for. It finds no unformatted disks.
/// </summary>
public sealed class NoDiskInventory : IDiskInventory
{
    /// <inheritdoc />
    public IReadOnlyList<RawDisk> GetUnformatted() => Array.Empty<RawDisk>();
}
