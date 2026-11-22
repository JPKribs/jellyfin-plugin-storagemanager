# Missing disks

When a disk Jellyfin uses drops off, Jellyfin can remove every item on it at the next library scan. Storage notices the disk is gone, keeps its items safe, and mounts it again.

## How a disk is found missing

Each check remembers the mount point of every library folder and Jellyfin folder. A disk is **Missing** when that mount point is no longer mounted, even if leftover files make its folders look present. A folder never seen before counts its disk missing when it sits where disks usually mount, such as `/mnt/<name>`, `/media/<name>`, `/Volumes/<name>`, a drive letter, or a network share.

A disk is **Unresponsive** when a call to it runs past 5 seconds, as a dead network share does. A stuck call is never started again until it returns, so a dead share cannot slow later checks.

## Library scans

Every full library scan runs as Jellyfin's **Scan media library** task. Storage checks the disks as the scan starts, and cancels it when a missing disk would lose its items. **Library scans** on the **Settings** tab sets when. See [Settings](Settings.md#missing-disks).

When a scan is blocked, the activity log records "Library scan blocked", naming the disk. With **Remount missing disks** on, the check the scan starts with also tries to mount the disk again, and a disk that comes back lets the scan run.

When a check cannot finish within 45 seconds, Storage uses the last check, or before the first one, the disks last recorded as missing. A scan is never let through for want of an answer.

## Real-time monitoring

With **Pause real-time monitoring** on, Jellyfin ignores file changes in a missing disk's folders until it is back. A disk that drops off then sets off no removals through the file watcher.

## Remounting

With **Remount missing disks** on, each check mounts a missing disk again, the way its OS does. Every missing disk is tried at once.

| OS | How | What it needs |
| :--- | :--- | :--- |
| Linux | Starts the mount unit systemd keeps for the disk's `/etc/fstab` entry | The disk in `/etc/fstab`, and the polkit rule from [Installation](Installation.md#allow-jellyfin-to-manage-disks) |
| macOS | Mounts the share's address with NetFS, as Finder's **Connect to Server** does | The share's password in the keychain |
| Windows | Restores the mapped drive, or connects the `\\server\share` path | The share's credentials in Credential Manager |

A disk is tried at three checks in a row. After that, Storage waits an hour before the next try, doubling the wait each time up to 12 hours. A new **Share address** is tried at the next check.

When a disk comes back on its own or through a remount, the activity log records "Disk remounted" or "Disk back". When the first try fails, it records "Disk not remounted" with the reason, such as "the saved sign-in was refused". Later tries that fail are not logged again.

## Share address

A share is mounted again from its address. Storage records the address at any check while the share is mounted. For a share that was already gone when Storage was installed, open it on the **Storage** tab and enter its **Share address**. See [Disk details](DiskDetails.md#share-address).

## A library's disk that is not mounted

On Linux, a library's disk that dropped off and was not remounted may show twice under **All**: once as the **Missing** disk, and once as a **Not Mounted** disk with what it holds. When `/etc/fstab` mounts it where a library expects its disk, its dialog says so and offers no format. Mount it again instead.

```bash
sudo mount /mnt/media
```

Next: [Activity log](ActivityLog.md).
