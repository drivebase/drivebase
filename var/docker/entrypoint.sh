#!/bin/sh

# Run database migrations
echo "Running database migrations..."
node scripts/migrate-deploy.mjs

# Start the application
echo "Starting the application..."
exec node main.js 