# Testing

How to test this plugin, from a single method to a page on a real server. A change is done when the tests for every layer it touches pass.

## The Rule

Every source file with logic has a test file, and every test proves that given inputs produce the expected output. A bug fix starts with a test that fails without the fix.

## Layers

Test each behavior at the lowest layer that can prove it. Go up a layer only for what the lower one cannot reach.

| Layer | Proves | Runs | Time |
| :--- | :--- | :--- | :--- |
| Unit | One class or function gives the right output for each input | `dotnet test` | Seconds |
| Resources | Every dashboard file is embedded, so no page loads blank | `dotnet test` | Seconds |
| Page scripts | Each page module parses, and every Base name it imports exists | `node --check` and the typings | Seconds |
| Harness | Each page draws, saves, and behaves with Jellyfin's real styles, at 1280 and 375 px | Headless Chromium, per [Harness](#harness) | Minutes |
| Test server | A page looks right and behaves on a real Jellyfin 12.4 | By hand | Minutes |

| A change to | Needs |
| :--- | :--- |
| A class or function with logic | Unit |
| A new or renamed dashboard file | Resources |
| A config page script | Page scripts, then the test server |
| An event subscription, a scheduled task, or a route | Unit where it can reach, then the test server |

## Layout

The tests sit in the root of `Jellyfin.Plugin.Storage.Tests/`, one file per subject, named after it.

| Source | Test |
| :--- | :--- |
| `Jellyfin.Plugin.Storage/Plugin.cs` pages | `Jellyfin.Plugin.Storage.Tests/EmbeddedResourceTests.cs` |

## C# Tests

Tests use xUnit with plain `Assert`, and NSubstitute for the Jellyfin interfaces a class takes.

```csharp
/// <summary>
/// Every dashboard file is embedded under its page name.
/// True: each registered page loads from the plugin.
/// False: the page loads blank with no build error.
/// </summary>
[Theory]
[InlineData("storage_storage.html")]
[InlineData("storage_common.js")]
public void DashboardFileIsEmbedded(string file)
{
    var names = typeof(Plugin).Assembly.GetManifestResourceNames();

    Assert.Contains("Jellyfin.Plugin.Storage.Web." + file, names);
}
```

```bash
dotnet test
```

### Naming and Comments

* Name the class `<Subject>Tests` and each method `Method_Scenario_Expectation`.
* Give the class a one sentence summary of what its subject must guarantee.
* Give each new test the three line summary. What it proves, what passing means, and what failing would cause.

### Writing a Test

* Arrange, act, and assert, separated by blank lines.
* Assert one behavior per test. Several asserts are fine when they check one outcome.
* Use `[Theory]` with `[InlineData]` for one rule over several inputs.
* Test the edges. Null, empty, the largest value, a cancelled token, and a disk or share that is missing or times out.
* Never sleep. Pass a clock or a delay in, and control it from the test. A test that must wait on background work polls with a deadline.
* A test that fails once in many runs has found a race. Fix the source or the test, and never run it again until it passes.
* A test never reaches the network. Substitute `IHttpClientFactory`, or give it a stub `HttpMessageHandler`.
* A test never reads a real disk or share. Substitute the file system, or point it at a temporary folder.

### Substitutes

* Substitute a Jellyfin interface with `Substitute.For<T>()`, and assert on what it received.
* Wire shared services in one helper class, and extend it rather than wiring a second copy in a test file.
* Keep state files in a temporary folder the test deletes. Never write to a real Jellyfin folder.

## Page Scripts

There are no JavaScript unit tests. Check each page module before you call a change done.

```bash
for f in Jellyfin.Plugin.Storage/Web/*.js; do node --check "$f"; done
```

Then check that every name `storage_common.js` imports from Base is in the typings of the version the csproj names.

```bash
grep -E "export (function|var|const) createConfigPage\b" ~/.nuget/packages/jpkribs.jellyfin.base/<version>/assets/jpkribs_shared.d.ts
```

* Only `storage_common.js` imports Base, so its import list is the one to check.
* A function that needs elements can be tried against Base's `fake-dom.mjs` from `../Shared/jellyfin-plugin-base/JPKribs.Jellyfin.Base.Tests/js/`. Keep such a check outside the repository.

## Harness

A harness loads the page modules in headless Chromium with a stand-in `ApiClient`. The [screenshot kit](documentation.md#the-screenshot-kit) is one, and a check for a change can reuse it.

* Load Jellyfin's real stylesheets as its `index.html` does, its two first, then the chunks and the dark theme, and mimic its emby-* element upgrades. Base's CSS alone hides real bugs.
* Click through as a user would. Type real keystrokes in pickers, and open every tab, every collapsible, and every dialog, at 1280 and 375 px.
* Type part of a real name in each lookup and see its list, then save and check that the stored value is the ID.
* Look at each screenshot the harness saves.
* A harness never decides that work is done. Check it on a test server afterwards.

## Test Server

Install a build on a Jellyfin 12.4 test server to look at a page or raise a real event. See [documentation.md](documentation.md#installing-a-build-by-hand).

* Hard reload the dashboard after installing a build, since it caches page scripts.
* Use a test server, never one people watch on, and disks that hold nothing you need.

## Checklist

* [ ] Every changed source file with logic has tests.
* [ ] A bug fix has a test that fails without it.
* [ ] Edges are covered, including null, empty, cancelled, and a missing disk.
* [ ] Substitutes come from NSubstitute or the shared test helper.
* [ ] `dotnet test` passes.
* [ ] Every page script passes `node --check`, and its Base imports exist.
* [ ] Every changed page was clicked through in the harness at 1280 and 375 px, and each screenshot was looked at.
* [ ] Every changed page was tried on a test server.
