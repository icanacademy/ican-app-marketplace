#!/bin/bash

# ICAN App Marketplace - Easy Startup Script
# Double-click this file to start the marketplace

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the project directory
cd "$DIR"

# Clear the terminal
clear

echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║        🚀  ICAN App Marketplace Launcher  🚀            ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Project Directory: $DIR"
echo ""

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "📦 First time setup - Installing dependencies..."
    echo "   This may take a minute..."
    npm install
    echo ""
fi

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ Starting ICAN App Marketplace..."
echo ""
echo "📱 Access URLs:"
echo "   • On this computer: http://localhost:3010"
echo "   • On local network:  http://$LOCAL_IP:3010"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "💡 Tips:"
echo "   • Share the network URL with other teachers"
echo "   • Press Ctrl+C to stop the server"
echo "   • Keep this window open while using the marketplace"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Start Cloudflare tunnel if not already running
if ! pgrep -f "cloudflared tunnel run cosmodrive" > /dev/null 2>&1; then
    echo "🌐 Starting Cloudflare Tunnel..."
    cloudflared tunnel run cosmodrive &
    sleep 2
    echo "✅ Cloudflare Tunnel started"
else
    echo "🌐 Cloudflare Tunnel already running"
fi
echo "🌍 Public URL: https://marketplace.icanacademy.work"
echo ""

# Start the server
node server.js
