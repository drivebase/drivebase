#!/bin/sh

# Start nginx in the background
nginx -g "daemon off;" &

# Store nginx's PID
NGINX_PID=$!

# Run migrations
npm run migration:run

# Start the application
node dist/main &

# Store the application's PID
APP_PID=$!

# Function to handle shutdown
shutdown() {
    echo "Shutting down..."
    kill $NGINX_PID
    kill $APP_PID
    exit 0
}

# Trap SIGTERM and SIGINT
trap shutdown SIGTERM SIGINT

# Wait for both processes
wait