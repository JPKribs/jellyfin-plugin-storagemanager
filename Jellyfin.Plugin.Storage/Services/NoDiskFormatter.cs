using System;
using System.Collections.Generic;
using Jellyfin.Plugin.Storage.Models;

namespace Jellyfin.Plugin.Storage.Services;

/// <summary>
/// The formatter on an OS the plugin has none for. No disk can be formatted.
/// </summary>
public sealed class NoDiskFormatter : IDiskFormatter
{
    /// <inheritdoc />
    public IReadOnlyList<string> FileSystems => Array.Empty<string>();

    /// <inheritdoc />
    public bool DashesForSpaces => false;

    /// <inheritdoc />
    public string? MountRoot => null;

    /// <inheritdoc />
    public FormatResult Format(RawDisk disk, string name, string fileSystem) => FormatResult.Failed("Formatting is not supported on this OS");
}
