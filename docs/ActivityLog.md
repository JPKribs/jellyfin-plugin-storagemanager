# Activity log

Storage writes each change to Jellyfin's activity log once, when it happens, in the server's display language. Open it from **Dashboard → Activity**.

## Entries

| Entry | Severity | When |
| :--- | :--- | :--- |
| "Disk missing" | Error | A disk Jellyfin uses is no longer mounted |
| "Disk unresponsive" | Warning | A disk Jellyfin uses stopped answering |
| "Disk back" | Information | A missing or unresponsive disk can be read again |
| "Disk remounted" | Information | Storage mounted a missing disk again |
| "Disk not remounted" | Error | The first try to mount a missing disk again failed |
| "Library scan blocked" | Warning | A full library scan was cancelled while a disk was missing |
| "Disk low on space" | Warning | A disk passed its **Storage low** alert |
| "Disk full" | Error | A disk passed its **Storage full** alert |
| "Disk failing" | Error | A disk's SMART data started predicting it will fail |
| "Disk too hot" | Warning | A disk ran past the **Too hot** alert |
| "Disk worn out" | Warning | An SSD passed the **Worn out** alert |
| "Disk formatted" | Information | Storage formatted a disk |
| "Disk not formatted" | Error | A format failed |
| "Folder added" | Information | Storage made a folder on a disk |

Changes of one kind in one check are summed into one entry, such as "Disks missing" for a network storage device that drops three shares at once.

## Examples

| Entry | Overview |
| :--- | :--- |
| "Disk missing" | media at /mnt/media is not mounted. |
| "Disk back" | media at /mnt/media is back after 2 hours. |
| "Disk full" | music at /mnt/music is 96% full with 160 GB free. |
| "Disk not remounted" | Media at /Volumes/Media couldn't be remounted: the saved sign-in was refused. |
| "Disk formatted" | Formatted Samsung SSD 870 (/dev/sdb) as EXT4 at /mnt/Media and added it to Movies. |

A disk that falls back below an alert, cools down, or keeps failing writes nothing more. Storage records changes, not states.

## Server log

Storage also writes to Jellyfin's server log. Information lines record a disk remounted, a folder made, a format, and real-time monitoring paused or resumed. Warning lines record a disk that went missing, passed an alert, or could not be remounted. Turn on Debug logging for `Jellyfin.Plugin.Storage` to see each check's decisions.

Next: [Troubleshooting](Troubleshooting.md).
