#!/bin/sh

if [ "$1" = "telegram-login" ]; then
  echo "Running Telegram login..."
  node scripts/telegram-login.mjs
  exit 0
fi

# Run database migrations
echo "Running database migrations..."
node scripts/migrate-deploy.mjs


/usr/bin/supervisord -c /etc/supervisord.conf