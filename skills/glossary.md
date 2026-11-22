# Glossary

The agreed name for every concept in this plugin. The UI, the docs, messages, and code use these words and no others.

* Use the **Term** in the UI, the docs, and messages.
* The **In Code** column names the type or member that holds it, when the code name differs.
* Never use a word from the **Not** column for the concept.
* Add a term here before it appears anywhere else. Rename it here first when it changes, then everywhere in the same commit.
* A term marked **Planned** names a feature that is not built yet. Fill its **In Code** column when the code lands.

## Storage

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Disk | A drive or share that holds at least one library folder, one row on the Storage tab | `DiskInfo` | Drive, volume, device |
| Network | A share reached over the network, such as SMB or NFS, shown with the Network tag | `DiskKind.Share` | Network drive, export, NAS |
| External | A disk plugged in from outside, such as over USB or Thunderbolt, shown with the External tag | `DiskKind.External` | Removable, USB disk, portable |
| Local | A disk inside the server, shown with the Local tag | `DiskKind.Local` | Internal, fixed |
| Mount point | The folder a disk is attached at, which identifies the disk | `DiskInfo.MountPoint` | Mount path, drive letter |
| Available | A disk the server can read at its mount point | `DiskState.Available` | Mounted, online, connected |
| Missing | A disk that left its mount point, or never answered at it | `DiskState.Missing` | Offline, lost, unmounted |
| Unresponsive | A disk whose calls ran past the time limit, as a dead share's do | `DiskState.Unresponsive` | Not answering, unreachable, timed out, hung |
| In use | A disk at least one library has a folder on. Only these are recorded and guarded | `DiskInfo.InUse` | Used, active |
| Unused | A mounted disk no library has a folder on, shown under the All filter, beside Jellyfin | `DiskInfo.InUse` | Not in use, spare, idle |
| Unformatted | A whole disk with no file system on it or any partition, so it has no mount point | `DiskState.Unformatted` | Raw, blank, empty disk |
| Not mounted | A disk that holds data but has nothing mounted, listed on Linux with what is on it | `DiskState.NotMounted`, `RawDisk.Contents` | Unmounted, offline |
| Missing folder | A library folder that is gone from a disk that is available | `DiskInfo.MissingFolders` | Lost folder |
| Share address | Where a share is mounted from, such as smb://nas/Media, seen while it was mounted or set in its dialog | `PluginConfiguration.ShareAddresses`, `DiskInfo.ShareAddress` | Source, URL, path |
| Format | Erases an unformatted disk, gives it one partition with a file system, and mounts it where it stays mounted | `DiskFormatting`, `IDiskFormatter` | Initialize, wipe, provision |
| New folder | A folder made at the top of a mounted disk from its dialog, optionally added to a library | `FolderCreator`, `POST Storage/Folders` | Create directory, mkdir |
| Remount | Mounts a missing disk again from what it was mounted from, the way its OS does | `IRemounter`, `PluginConfiguration.Remount` | Reconnect, reattach |
| SMART health | The disk's own report of its condition: Good or Failing, with its temperature, power-on time, and wear when it reports them | `DiskInfo.Health`, `ISmartReader` | Drive health, disk status |
| Failing | A disk whose SMART data predicts it will fail | `DiskHealth.Failing` | Bad, dying, degraded |

## Alerts

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Storage low | Marks a disk low on space and logs a warning when it fills past its point, set as % used or GB free | `PluginConfiguration.WarningStop` | Warning alert, threshold, soft limit |
| Storage full | Marks a disk full and logs an error when it fills past its point, set as % used or GB free | `PluginConfiguration.ErrorStop` | Error alert, threshold, hard limit |
| Too hot | A disk at or past the Too hot temperature, clearing 5 °C below it | `HealthAlerts.Hot`, `DiskInfo.Hot` | Overheating, thermal |
| Worn out | An SSD at or past the Worn out share of its rated life | `HealthAlerts.Worn`, `DiskInfo.Worn` | Wearing, end of life |
| Low | A disk past its Storage low alert | `SpaceLevel.Warning`, `DiskEventKind.Low` | Nearly full, almost full |
| Full | A disk past its Storage full alert | `SpaceLevel.Error` | Out of space |

## Libraries

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Scan guard | Blocks a library scan while a disk it would scan is missing or unresponsive | `ScanGuard`, `PluginConfiguration.ScanGuard` | Scan lock, scan block |
| Pause real-time monitoring | Makes Jellyfin ignore file changes in a missing disk's folders until it is back | `MonitorMuter`, `PluginConfiguration.MuteMonitoring` | Stop watching, disable monitor |
| Check storage | The scheduled task that checks every disk | `CheckStorageTask` | Disk scan, storage scan |

## Settings

| Term | Meaning | In Code | Not |
| :--- | :--- | :--- | :--- |
| Global settings | The settings every disk uses unless it has an override | `PluginConfiguration.WarningStop`, `PluginConfiguration.ErrorStop` | Defaults, general settings |
| Override | Alerts one disk sets for itself in its dialog instead of the global alerts | `PluginConfiguration.DiskOverrides`, `DiskInfo.OwnAlerts` | Custom setting, exception |

## Housekeeping

| Term | Meaning | Not |
| :--- | :--- | :--- |
| Activity page | Jellyfin's dashboard activity log | Activity feed, log page |
| Server log | Jellyfin's log files | Debug log |
