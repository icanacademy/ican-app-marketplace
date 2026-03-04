#!/bin/bash

# ICAN App Marketplace Startup Script

echo "🚀 Starting ICAN App Marketplace..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
else
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

echo "✅ Starting server..."
echo ""
echo "📱 Access the marketplace at:"
echo "   Local:   http://localhost:3010"
echo "   Network: http://$LOCAL_IP:3010"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
node server.js
