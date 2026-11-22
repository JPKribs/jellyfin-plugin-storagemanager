# Installation

Storage needs Jellyfin 12.4.

## Add the plugin repository

1. Open Jellyfin and go to **Dashboard → Plugins → Repositories**.
2. Select **Add Repository**.
3. Enter this repository URL and select **Save**.

```
https://raw.githubusercontent.com/JPKribs/jellyfin-plugin-storagemanager/master/manifest.json
```

## Install the plugin

1. Open the **Catalog** tab in the plugins section.
2. Find **Storage** and select **Install**.
3. Wait for the installation to finish.

## Restart Jellyfin

Restart the Jellyfin server and wait for it to start.

## Check it works

**Storage** appears in the dashboard's side menu. Open it, and the **Storage** tab lists the disks Jellyfin uses.

Reading disks, space, and alerts works with Jellyfin's own access on every OS. Remounting, formatting, and some SMART readings change or read disks directly, so they need the setup below for the server's OS.

## Linux

Storage reads SMART data, formats disks, and mounts them through udisks2, and remounts disks through systemd. Most distributions include udisks2. Install it when it is missing.

```bash
sudo apt install udisks2
```

### Allow Jellyfin to manage disks

Jellyfin running as root can format and remount disks already. Jellyfin running as its own `jellyfin` user, as the Debian and Ubuntu packages do, needs a polkit rule. Save this as `/etc/polkit-1/rules.d/50-jellyfin-storage.rules`.

```javascript
polkit.addRule(function (action, subject) {
    if (subject.user != "jellyfin") return;
    if (action.id == "org.freedesktop.systemd1.manage-units" && /\.mount$/.test(action.lookup("unit"))) return polkit.Result.YES;
    if (action.id.indexOf("org.freedesktop.udisks2.") == 0) return polkit.Result.YES;
});
```

polkit reads the new rule at once, with no restart.

!!! warning "What the rule allows"
    The rule lets the `jellyfin` user start mount units and use every udisks2 action, on any disk. Storage itself never touches the system disk or a mounted disk. If Jellyfin were ever compromised, the same rule would allow changes to other disks.

### File systems

The **Format** form offers each file system udisks2 has the tools to make. Install the tools for any that are missing.

| File system | Package |
| :--- | :--- |
| ext4 | `e2fsprogs`, installed on every system |
| XFS | `xfsprogs` |
| Btrfs | `btrfs-progs` |
| exFAT | `exfatprogs` |
| NTFS | `ntfs-3g` |

### Remounting

A disk is remounted when `/etc/fstab` has an entry for it. A disk Storage formats gets one. A disk mounted by hand, with no entry, is not remounted.

## macOS

Storage remounts a missing share the way Finder's **Connect to Server** does. Two things make that work.

* **The password is in the keychain.** Connect to the share once in Finder as the account Jellyfin runs as, and select **Remember this password in my keychain**. Storage never shows a sign-in window, so a share whose password is not saved cannot be remounted.
* **Storage knows the share's address.** Storage records it, such as `smb://alex@nas.local/Media`, at any check while the share is mounted. For a share that was already gone when Storage was installed, open it on the **Storage** tab and enter its address under **Share address**, such as `smb://nas.example.com/Media`.

A share in `/Volumes` comes back under its own name, as Finder mounts it. A share mounted in any other folder comes back to that folder. macOS mounts local disks on its own when they are plugged in, so Storage leaves them alone.

## Windows

Run Jellyfin as a service under LocalSystem, as the installer does, or as an administrator. Reading unformatted disks, reading SMART data, and formatting all need administrator rights.

Storage reconnects a missing share with the credentials Windows saved for it in Credential Manager, for the account Jellyfin runs as. A `\\nas\Media` path and a drive letter mapped to a share both work with no setup.

Next: [Storage tab](StorageTab.md).
