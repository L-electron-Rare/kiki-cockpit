#!/bin/sh
# Copy the read-only mounted /root/.ssh (uid 1000 from /home/electron/.ssh)
# into a root-owned location so OpenSSH stops complaining about file
# ownership/permissions. Only runs if the source mount exists.
if [ -d /root/.ssh ] && [ ! -f /root/.ssh.local/.ready ]; then
  mkdir -p /root/.ssh.local
  cp -L /root/.ssh/id_ed25519 /root/.ssh.local/ 2>/dev/null || true
  cp -L /root/.ssh/id_ed25519.pub /root/.ssh.local/ 2>/dev/null || true
  cp -L /root/.ssh/known_hosts /root/.ssh.local/ 2>/dev/null || true
  if [ -f /root/.ssh/config ]; then
    # Rewrite IdentityFile paths so the relocated config still points at our copy
    sed -E 's|/home/electron/\.ssh/|/root/.ssh.local/|g; s|~/\.ssh/|/root/.ssh.local/|g' \
      /root/.ssh/config > /root/.ssh.local/config 2>/dev/null || true
  fi
  chown -R root:root /root/.ssh.local
  chmod 700 /root/.ssh.local
  chmod 600 /root/.ssh.local/* 2>/dev/null || true
  touch /root/.ssh.local/.ready
fi
exec "$@"
