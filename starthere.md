# Start Here

Read this file before you change anything in this repository. It applies to people and to AI assistants alike.

## The Guides

Each guide in [skills](skills/) covers one kind of work. Read the guide that matches the task before you start it.

| Guide | Read it before you |
| :--- | :--- |
| [skills/glossary.md](skills/glossary.md) | Name anything, in the UI, the docs, or code. |
| [skills/style.md](skills/style.md) | Build or change anything a user sees, including labels, messages, and layout. |
| [skills/code.md](skills/code.md) | Write or change code or comments in any language. |
| [skills/testing.md](skills/testing.md) | Write or run tests. |
| [skills/profiling.md](skills/profiling.md) | Find or fix slow C#, or change code on a hot path. Profile only for a reported symptom, a hot path change, or a number that grew. |
| [skills/documentation.md](skills/documentation.md) | Write or change the README, the docs site, screenshots, or release notes. |
| [skills/review.md](skills/review.md) | Call any change done. |
| [skills/release.md](skills/release.md) | Cut a release. |
| [skills/branches.md](skills/branches.md) | Pick a branch, sync the two, and promote unstable. |
| [skills/translations.md](skills/translations.md) | Add or change a string a person reads. |
| [skills/logging.md](skills/logging.md) | Write an activity log entry or a server log line. |

A task that touches several areas needs every matching guide. A new disk action, for example, needs the glossary, style, code, testing, documentation, and review guides.

Read [Architecture](docs/Architecture.md) before changing how the parts connect.

## Ground Rules

* **Base comes first.** Anything reusable lives in [JPKribs.Jellyfin.Base](https://github.com/JPKribs/jellyfin-plugin-base). Search it before you build anything, use what it has, and never copy or override it locally.
* **Describe the current release only.** Docs, labels, and comments say what the plugin does today. Release notes are the only place for what changed.
* **Keep it short.** Every label, message, and comment is as brief as it can be while staying clear.
* **One word per concept.** Use the term in the glossary, everywhere.
* **Prove it with a test.** A change is not done until a test shows that its inputs give the right output.

## Verify Before Done

Work is done when it has been checked, not when it has been written.

* Run every check the change needs, and read its output. A check that did not run has not passed, and neither has one that ran before the last change.
* Look at every changed page on a test server.
* Read the whole diff before reporting, using [skills/review.md](skills/review.md).
* Check every new string against the style checklist and the glossary.
* Check every claim in a doc against the code or the running plugin.
* Report what was checked, what was not, and why. Never call work done while a check fails.

## Stop and Ask

Stop and ask before any of these, even when the task seems to call for it.

* **Disks and system files.** Anything that formats, partitions, mounts, unmounts, or remounts a disk or share, or writes `fstab`, a polkit rule, a mount point's attributes, or any other file outside Jellyfin's own folders.
* **Library safety.** A change to when a library scan is blocked or let through, or to when real-time monitoring is muted or released for a missing disk.
* **Privileges.** A change that runs anything as root or an administrator, asks for more rights, or stores a share's password.
* **Who may act.** A change to the administrator policy on `StorageController`, or to a route that lets anyone else act on a disk.
* **State files.** A change to the shape of `Jellyfin.Plugin.Storage.xml` or any state file beside it, or anything that resets, moves, or deletes them.
* **Base.** Any change to Base, since every plugin takes it.
* **Settings.** Renaming, removing, or changing the default of a setting or a per disk override users already have.
* **Releases.** Raising the version, publishing, or pushing to `master`.
* **The rules.** Any case where following a guide would make the result worse.

Explain what you would change, why, and what it risks. Wait for an answer before you act.

## The Repository

| Path | What it holds |
| :--- | :--- |
| `Jellyfin.Plugin.Storage/` | The plugin source. |
| `Jellyfin.Plugin.Storage/Api/` | The `Storage` controller. |
| `Jellyfin.Plugin.Storage/Configuration/` | The plugin configuration class. |
| `Jellyfin.Plugin.Storage/Web/` | The dashboard pages, as HTML, JS, and CSS. |
| `Jellyfin.Plugin.Storage/Assets/` | The plugin logo. |
| `Jellyfin.Plugin.Storage/Localization/` | The plugin's own strings, in `en-us.json`. |
| `Jellyfin.Plugin.Storage.Tests/` | The xUnit tests. |
| `docs/` | The documentation site, built with MkDocs. |
| `build.yaml` | The version, the artifacts, and the release notes. |
| `build.sh` | Builds the plugin zip into `dist/`. |
| `manifest.json` | The plugin catalog every server reads, written by the publish workflow. |
| `skills/` | The guides. |
| `tools/` | Development tools that never ship, such as the screenshot rig. |
| `../Shared/jellyfin-plugin-base/` | A local checkout of Base, when present. Read it, and never change it from work on this plugin. |
