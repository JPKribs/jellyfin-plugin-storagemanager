#!/usr/bin/env bash
# Runs the live Linux tests in a container that boots systemd. Usage: tools/linux-live/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
image=storage-linux-live
name=storage-linux-live

docker build -t "$image" "$here"
docker rm -f "$name" >/dev/null 2>&1 || true
docker run -d --name "$name" --privileged --cgroupns=host -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -v "$repo":/src:ro --tmpfs /run --tmpfs /run/lock "$image" >/dev/null
trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT

# Wait for systemd to finish booting.
for _ in $(seq 1 60); do
  state="$(docker exec "$name" systemctl is-system-running 2>/dev/null || true)"
  [[ "$state" == running || "$state" == degraded ]] && break
  sleep 1
done
echo "systemd: $state"

# Docker's /dev is a fixed copy, so a partition made on a loop device never gets its node. The kernel's devtmpfs
# adds nodes as they appear, as on a real machine.
docker exec "$name" bash -c 'mount -t devtmpfs devtmpfs /dev && mkdir -p /dev/pts /dev/shm && mount -t devpts devpts /dev/pts && mount -t tmpfs tmpfs /dev/shm && systemctl restart systemd-udevd'

docker exec "$name" bash -c '
  set -e
  cp -r /src /work && cd /work
  rm -rf */bin */obj
  STORAGE_LIVE_LINUX=1 dotnet test Jellyfin.Plugin.Storage.Tests -c Release \
    --logger "console;verbosity=normal" > /work/test.log 2>&1 || true
  grep -E "Passed LinuxLive|Failed |Total tests|Passed:|Failed:| error " /work/test.log || true
  # The live tests'"'"' own output, and every failure in full.
  grep -A20 -E "^  Failed " /work/test.log || true
  grep -E "Loop device|File systems|FormatResult|RemountResult|Unformatted:|SMART for|Mounts:|Debug:|Warning:|Exception" /work/test.log || true

  # Again as the jellyfin user, as Jellyfin runs on a real server, allowed by the polkit rule from the install guide.
  # Root sets up the scratch disk, since only root can make a loop device.
  image=/tmp/storage-rootless.img
  image2=/tmp/storage-rootless2.img
  truncate -s 128M "$image" "$image2"
  device="$(losetup --find --show --partscan "$image")"
  device2="$(losetup --find --show --partscan "$image2")"
  chown -R jellyfin /work
  runuser -u jellyfin -- env HOME=/home/jellyfin DOTNET_CLI_HOME=/home/jellyfin STORAGE_LIVE_ROOTLESS_DEVICE="$device" STORAGE_LIVE_ROOTLESS_DEVICE2="$device2" \
    dotnet test Jellyfin.Plugin.Storage.Tests -c Release --no-build --filter "FullyQualifiedName~JellyfinsOwnUser" \
    --logger "console;verbosity=normal" > /work/rootless.log 2>&1 || true
  echo "--- as the jellyfin user"
  grep -E "Passed |Failed |Rootless|Error Message|Warning:" /work/rootless.log | grep -v "^\[xUnit" || true
  grep -A12 -E "^  Failed " /work/rootless.log || true
  grep -qE "Passed |Failed " /work/rootless.log || tail -25 /work/rootless.log
  # A reboot mounts from /etc/fstab as root, so the exFAT disk is mounted again that way and must still belong to the jellyfin user.
  echo "--- after a remount as root"
  umount /mnt/RootlessX 2>/dev/null && mount /mnt/RootlessX && runuser -u jellyfin -- sh -c "echo ok > /mnt/RootlessX/after-reboot.nfo" && echo "jellyfin can write to exFAT mounted by root" || echo "jellyfin CANNOT write to exFAT mounted by root"
  umount /mnt/Rootless /mnt/RootlessX 2>/dev/null || true
  sed -i "/\/mnt\/Rootless/d" /etc/fstab
  losetup -d "$device" "$device2"
'
