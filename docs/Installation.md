# Installation

## Add the plugin repository

1. Open Jellyfin and go to **Dashboard → Plugins → Repositories**.
2. Click **Add Repository**.
3. Enter this repository URL and click **Save**:

```
https://raw.githubusercontent.com/JPKribs/jellyfin-plugin-storagemanager/master/manifest.json
```

## Install the plugin

1. Open the **Catalog** tab in the Plugins section.
2. Find **Storage** and click **Install**.
3. Wait for the installation to complete.

## Restart Jellyfin

Restart your Jellyfin server completely and wait for it to fully start up.

## Check it works

Go to **Dashboard → Plugins → Storage** and confirm the configuration page loads.

## Format and remount disks on Linux

Storage remounts a missing disk on Linux by starting the mount systemd keeps for its `/etc/fstab` entry, and formats a new disk through udisks2, which most distributions include and which installs as the `udisks2` package. Jellyfin running as root can do both already. Jellyfin running as its own `jellyfin` user needs a polkit rule, such as `/etc/polkit-1/rules.d/50-jellyfin-storage.rules`:

```javascript
polkit.addRule(function (action, subject) {
    if (action.id == "org.freedesktop.systemd1.manage-units" &&
        subject.user == "jellyfin" &&
        /\.mount$/.test(action.lookup("unit"))) {
        return polkit.Result.YES;
    }
    if (action.id.indexOf("org.freedesktop.udisks2.") == 0 && subject.user == "jellyfin") {
        return polkit.Result.YES;
    }
});
```

## Remount shares on macOS

Storage remounts a missing share on macOS the way Finder's **Connect to Server** does. Two things make that work:

* **The password is in the keychain.** Connect to the share once in Finder as the account Jellyfin runs as, and choose **Remember this password in my keychain**. Storage never shows a sign-in window, so a share whose password is not saved can't be remounted.
* **Storage knows the share's address.** Storage records it, such as `smb://you@nas._smb._tcp.local/Media`, at any check while the share is mounted. For a share that was already gone when Storage was installed, open it on the **Storage** tab and enter its address under **Share address**, such as `smb://nas/Media`. It is tried at the next check.

A share in `/Volumes` comes back under its own name, as Finder mounts it. A share mounted in any other folder comes back to that folder.

## Remount shares on Windows

Storage reconnects a missing share on Windows with the credentials Windows saved for it in Credential Manager, for the account Jellyfin runs as. A `\\nas\Media` path and a drive letter mapped to a share both work with no setup. A share can also be given its address under **Share address** in its dialog.
