# Building and testing

## Build

Storage builds with the .NET 10 SDK against Jellyfin 12.4.

```bash
./build.sh Release
```

The zip lands in `dist/` as `jellyfin-plugin-storagemanager-<version>.zip`. Unzip it into `<config>/plugins/Storage_<version>/` on a Jellyfin 12.4 test server and restart the server.

## Unit tests

```bash
dotnet test -c Release
```

The tests cover the rules that decide what Storage does: grouping folders onto disks, alerts and their margins, health alerts, missing disks, the scan guard, remounting and its pauses, the inventories on each OS, SMART parsing, formatting's safety checks, and folder names. They run on any OS.

## Live tests

Some tests run against a real system, and only when asked, since they create and erase disks.

### macOS

Formats a blank disk image with diskutil, then detaches it.

```bash
STORAGE_LIVE_MAC=1 dotnet test -c Release
```

### Linux

`tools/linux-live/run.sh` builds a Debian container that boots systemd, with udisks2, polkit, and a `jellyfin` user allowed by the same polkit rule the install guide gives. It runs every test as root, then the format tests again as the `jellyfin` user.

```bash
tools/linux-live/run.sh
```

The live tests remount an `/etc/fstab` entry through systemd, format scratch loop disks through udisks2, erase a disk that holds a file system, and check that Jellyfin's user can write to ext4 and exFAT disks after they are mounted again as root, as at a restart.

## Screenshots

`tools/screenshots/` serves the plugin's pages with jellyfin-web's styles and sample data, and takes every image in `docs/screenshots/`. See its [README](https://github.com/JPKribs/jellyfin-plugin-storagemanager/blob/master/tools/screenshots/README.md).

```bash
python3 -I tools/screenshots/server.py 8873 &
```

```bash
node tools/screenshots/shots.mjs
```

## Docs

```bash
pip install mkdocs==1.6.1 mkdocs-material==9.7.7
```

```bash
mkdocs build --strict
```
