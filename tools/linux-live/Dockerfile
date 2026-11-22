# A Debian container that boots systemd, with the .NET SDK, udisks2, polkit, an /etc/fstab entry, and a jellyfin user
# allowed by the same polkit rule the install guide gives, for the live tests.
FROM mcr.microsoft.com/dotnet/sdk:10.0
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends systemd systemd-sysv dbus udisks2 polkitd exfatprogs \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /mnt/storage-live \
 && echo "tmpfs /mnt/storage-live tmpfs defaults,size=16m 0 0" >> /etc/fstab \
 && useradd --system --create-home jellyfin \
 && mkdir -p /etc/polkit-1/rules.d \
 && printf '%s\n' \
    'polkit.addRule(function (action, subject) {' \
    '    if (subject.user != "jellyfin") return;' \
    '    if (action.id == "org.freedesktop.systemd1.manage-units" && /\.mount$/.test(action.lookup("unit"))) return polkit.Result.YES;' \
    '    if (action.id.indexOf("org.freedesktop.udisks2.") == 0) return polkit.Result.YES;' \
    '});' > /etc/polkit-1/rules.d/50-jellyfin-storage.rules
STOPSIGNAL SIGRTMIN+3
CMD ["/sbin/init"]
