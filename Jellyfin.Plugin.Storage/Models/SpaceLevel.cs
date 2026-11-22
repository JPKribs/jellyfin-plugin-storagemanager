namespace Jellyfin.Plugin.Storage.Models;

/// <summary>
/// How full a disk is against its stops.
/// </summary>
public enum SpaceLevel
{
    /// <summary>Below every stop.</summary>
    None = 0,

    /// <summary>Past the Warning stop.</summary>
    Warning = 1,

    /// <summary>Past the Error stop.</summary>
    Error = 2
}
