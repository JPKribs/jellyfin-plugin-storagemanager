using Xunit;

namespace Jellyfin.Plugin.Storage.Tests;

/// <summary>
/// Guards the dashboard pages: a page registered in <see cref="Plugin.GetPages"/> whose file is not
/// embedded loads as a blank page with no build error.
/// </summary>
public class EmbeddedResourceTests
{
    [Theory]
    [InlineData("storage_storage.html")]
    [InlineData("storage_storage.js")]
    [InlineData("storage_settings.html")]
    [InlineData("storage_settings.js")]
    [InlineData("storage_common.js")]
    [InlineData("storage_shared.css")]
    public void DashboardFileIsEmbedded(string file)
    {
        var names = typeof(Plugin).Assembly.GetManifestResourceNames();

        Assert.Contains("Jellyfin.Plugin.Storage.Web." + file, names);
    }

    [Fact]
    public void SharedAssetsAreEmbedded()
    {
        var names = typeof(Plugin).Assembly.GetManifestResourceNames();

        Assert.Contains(names, n => n.EndsWith("jpkribs_shared.js", System.StringComparison.Ordinal));
        Assert.Contains(names, n => n.EndsWith("jpkribs_shared.css", System.StringComparison.Ordinal));
    }
}
