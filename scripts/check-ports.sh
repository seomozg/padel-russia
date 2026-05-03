#!/bin/bash

# Script to check if required ports are available
PORTS=(80 443 3001 8080)

echo "Checking port availability..."

for PORT in "${PORTS[@]}"; do
    if netstat -tuln | grep -q ":$PORT "; then
        echo "❌ Port $PORT is already in use"
        echo "   Please stop the service using this port before deployment"
        netstat -tuln | grep ":$PORT "
    else
        echo "✅ Port $PORT is available"
    fi
done

echo ""
echo "Port check completed."