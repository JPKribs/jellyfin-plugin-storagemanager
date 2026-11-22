# Troubleshooting

## A disk does not show up

| Reason | What to do |
| :--- | :--- |
| No library or Jellyfin folder is on it. | Select **All** on the **Storage** tab. |
| It is smaller than 1 GB, or a volume the OS keeps for itself. | Storage leaves these out on purpose. |
| It holds data but is not mounted, on macOS or Windows. | Mount it with the OS. Only Linux lists these. |
| Jellyfin runs in Docker. | Storage sees only the folders mounted into the container. |
| On Windows, Jellyfin is not an administrator. | Run Jellyfin as a service under LocalSystem to list unformatted disks. |

## No SMART health

| Reason | What to do |
| :--- | :--- |
| The disk is a share, an SD card, or a virtual disk. | These report no SMART data. |
| On Linux, udisks2 is not installed or running. | Install `udisks2`. See [Installation](Installation.md#linux). |
| On macOS, the disk is SATA or USB. | Storage reads SMART data from NVMe disks on macOS. |
| On Windows, Jellyfin is not an administrator. | Run Jellyfin as a service under LocalSystem. |
| A USB enclosure does not pass SMART data through. | Nothing to do. Many enclosures do not. |

## A disk is not remounted

| Reason | What to do |
| :--- | :--- |
| **Remount missing disks** is off. | Turn it on in **Settings**. |
| On Linux, the disk has no `/etc/fstab` entry. | Add one. A disk Storage formats gets one. |
| On Linux, Jellyfin is not allowed to start mount units. | Add the polkit rule from [Installation](Installation.md#allow-jellyfin-to-manage-disks). |
| On macOS, the share's password is not in the keychain. | Connect once in Finder and save the password. |
| Storage never saw the share mounted. | Enter its **Share address** in its dialog. |
| It failed three times in a row. | Storage waits longer between tries. Mount it by hand, or select **Refresh** after fixing the cause. |

"Disk not remounted" in the activity log gives the reason for the first failure.

## Formatting fails

| Message | What to do |
| :--- | :--- |
| Jellyfin isn't allowed to manage disks | Add the polkit rule from [Installation](Installation.md#allow-jellyfin-to-manage-disks). |
| This disk isn't unformatted anymore | Something on it was mounted or written since the dialog opened. Select **Refresh**. |
| Another disk already uses that folder | Pick another name. |
| This is the disk a library expects at its mount point | It is a library's own disk. Mount it again instead of erasing it. |
| This server can't format disks | On Linux, install `udisks2`. In Docker, format on the host. |

## Read Only folders

A folder marked **Read Only** is one Jellyfin's user cannot write to, so NFO files and artwork saved next to the media fail there. Common causes are a read-only mount, a share mounted for one user, and a folder owned by another user. Give Jellyfin's user write access to the folder, then select **Refresh**.

On Linux, check the folder's owner and mode.

```bash
ls -ld /mnt/media/Movies
```

## Library scans are blocked

A full library scan is blocked while a disk it would scan is missing. Mount the disk, or set **Library scans** to **Never block** in **Settings** to let every scan run. With **Never block**, items on a missing disk may be removed.
