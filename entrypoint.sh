#!/bin/sh
set -e

# Daily midnight reset: wipe user data and kill pith; the restart loop brings it back clean
echo "0 0 * * * root rm -rf /root/.pith/projects /root/.pith/config.json && pkill -f pith || true" > /etc/cron.d/pith-reset
chmod 0644 /etc/cron.d/pith-reset

# Start cron daemon
cron

# Run pith, restarting automatically after nightly reset
while true; do
    /usr/local/bin/pith
    sleep 1
done
