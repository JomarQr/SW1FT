#!/bin/bash
# Start the AegiSAML ML backend server
cd "$(dirname "$0")"
echo "Starting ML server on http://localhost:8000 ..."
server_env/bin/python3 server/main.py
