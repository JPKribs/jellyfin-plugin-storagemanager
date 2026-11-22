# API

Every route sits under `/Storage` and needs an administrator, except `GET /Storage/Translations`.

### GET /Storage/Disks

Checks every disk and returns one entry per disk. The disks Jellyfin uses come first, missing and unresponsive ones first among them.

| Status | Meaning |
| :--- | :--- |
| `200` | The disks |
| `401` | No administrator is signed in |

Each entry holds the disk's mount point, device, model, name, type, state, file system, size, free space, SMART readings, alert level and points, libraries, folders, missing folders, read only folders, and what it holds when it is not mounted.

### GET /Storage/Format

Returns what formatting offers on this server: `FileSystems`, the file systems it can make, the first being the usual one, `MountRoot`, the folder a new disk is mounted in, or `null` for a drive letter, and `DashesForSpaces`.

### POST /Storage/Format

Formats a disk with nothing mounted, mounts it, and adds it to a library when one is named. Erases the disk.

```json
{
  "Device": "/dev/sdb",
  "Name": "Media",
  "FileSystem": "ext4",
  "Erase": false,
  "Library": "Movies"
}
```

`Erase` must be `true` for a disk that holds data. The reply is `200` with `Formatted`, `MountPoint`, and, when it was refused, `ErrorKey` or `Error`.

### POST /Storage/Folders

Makes a folder at the top of a mounted disk and adds it to a library when one is named.

```json
{
  "MountPoint": "/mnt/Media",
  "Name": "Movies",
  "Library": "Movies"
}
```

The reply is `200` with `Created`, `Path`, and, when it was refused, `ErrorKey` or `Error`.

### GET /Storage/Translations

Returns the plugin's strings in one language, for the dashboard pages. Allows anonymous requests.

| Query | Meaning |
| :--- | :--- |
| `language` | The language, such as `de` or `pt-br`. Leave it out for US English. |

| Status | Meaning |
| :--- | :--- |
| `200` | The strings by key |
| `304` | The page already has these strings |

## Scheduled task

**Check storage**, under **Storage** in **Dashboard → Scheduled Tasks**, checks every disk every 30 minutes and at startup.
