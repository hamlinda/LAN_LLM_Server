#!/bin/bash

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PID_FILE="$DIR/server.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "Shutting down Ollama Local Server Web Client (PID: $PID)..."
    
    # Try graceful kill first (SIGTERM)
    kill -15 "$PID" 2>/dev/null
    
    # Wait up to 5 seconds for it to exit
    for i in {1..5}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Process did not exit gracefully, force killing..."
        kill -9 "$PID" 2>/dev/null
    fi
    
    rm -f "$PID_FILE"
    echo "Ollama Local Server Web Client stopped."
else
    # Fallback: check if server.py is running
    echo "No server.pid file found. Checking for running server.py process..."
    PID=$(pgrep -f "python3.*server.py" | grep -v "$$")
    if [ -n "$PID" ]; then
        echo "Found running process(es): $PID. Stopping..."
        kill -15 $PID 2>/dev/null
        sleep 1
        # Force kill if still running
        for P in $PID; do
            if ps -p "$P" > /dev/null 2>&1; then
                kill -9 "$P" 2>/dev/null
            fi
        done
        echo "Stopped process(es)."
    else
        echo "Ollama Local Server Web Client is not running."
    fi
fi
