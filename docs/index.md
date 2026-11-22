# Storage

![Storage](assets/logo.png){ width="160" }

Storage is a Jellyfin plugin that watches the disks and shares your libraries use.

## How it works

The **Storage** tab lists each disk and share your libraries or Jellyfin itself use, such as the disk with its cache and metadata, with its type (System, Local, External, or Network), state, and space. **All** also lists mounted disks no library uses. A banner at the top says what needs a look, one line per problem, or that every disk is healthy. Below it, cards add up the size, used, and free space of every disk your libraries use. **Refresh** checks every disk again. Open a disk for a chart of its space, its alerts, its libraries, and each folder.

The **Check storage** scheduled task checks every disk every 30 minutes and at startup, and records changes in the activity log: a disk that went missing, became unresponsive, came back, passed its Storage low or Storage full alert, or set off a disk health alert: failing, too hot, or worn out.

While a disk is missing, Storage tries to mount it again, can block library scans so Jellyfin does not remove that disk's items, and can pause real-time monitoring of its folders. The **Settings** tab sets the full disk alerts every disk uses, when scans are blocked, whether missing disks are remounted, and whether monitoring is paused. A disk can override the alerts in its dialog, and a share can be given the address it mounts from.

An unformatted disk's dialog can format it: pick a name, a file system, and optionally a library, then type the name to confirm. On Linux, **All** also lists disks that hold data but aren't mounted, such as a USB drive with an installer on it, with what's on them. Their dialog can erase and format them once the device name, such as `sda`, is typed.

A library folder Jellyfin can't write to, so it can't save NFO files or artwork, is flagged in the banner and the disk's folders table.

A mounted disk's dialog can make a folder at the top of the disk, such as Movies, and add it to a library in one step. Storage erases the disk, gives it one partition, mounts it where it stays mounted after a restart, and adds it to the library.
