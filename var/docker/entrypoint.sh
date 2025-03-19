#!/bin/sh

# Run database migrations
echo "Running database migrations..."
node scripts/migrate-deploy.mjs

/usr/bin/supervisord -c /etc/supervisord.conf