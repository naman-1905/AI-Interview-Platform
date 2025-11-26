#!/bin/bash

# Start script for AI Interview Platform Backend
# This script loads environment variables and starts the application with Gunicorn

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables
echo "Loading environment variables from .env.sh..."
source "$SCRIPT_DIR/.env.sh"

# Verify environment is loaded
if [ "$ENV_LOADED" != "true" ]; then
    echo "Error: Failed to load environment variables"
    exit 1
fi

echo "Environment variables loaded successfully"
echo "Environment: $ENVIRONMENT"
echo "Log Level: $LOG_LEVEL"
echo "Server: $SERVER_HOST:$SERVER_PORT"

# Check if gunicorn is installed
if ! command -v gunicorn &> /dev/null; then
    echo "Error: gunicorn is not installed"
    echo "Please install it with: pip install gunicorn"
    exit 1
fi

# Start the application with Gunicorn and 4 Uvicorn workers
echo ""
echo "Starting AI Interview Platform Backend..."
echo "Gunicorn with 4 Uvicorn workers on $SERVER_HOST:$SERVER_PORT"
echo ""

gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind "$SERVER_HOST:$SERVER_PORT" \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    app.main:app
