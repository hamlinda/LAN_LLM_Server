#!/bin/bash

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PID_FILE="$DIR/server.pid"
LOG_FILE="$DIR/server.log"

# Check if process is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Ollama Local Server Web Client is already running with PID $PID."
        exit 0
    fi
fi

# Check if python3 server.py is already running generally
EXISTING_PID=$(pgrep -f "python3.*server.py" | grep -v "$$" | head -n 1)
if [ -n "$EXISTING_PID" ]; then
    echo "Ollama Local Server Web Client seems to be already running with PID: $EXISTING_PID"
    exit 0
fi

echo "Starting Ollama Local Server Web Client..."
nohup python3 "$DIR/server.py" > "$LOG_FILE" 2>&1 &
PID=$!

# Save PID
echo $PID > "$PID_FILE"
echo "Ollama Local Server Web Client started in background (PID: $PID)."
echo "Logs are being written to $LOG_FILE"
echo "URL: http://localhost:8080/"
