#!/bin/bash
# Start the full SWARM dashboard stack

set -e

echo "🚀 Starting SWARM Dashboard Stack..."
echo ""

# Check if Node.js server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3000 already in use. Stopping existing server..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
    sleep 1
fi

# Check if Next.js is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3001 already in use. Stopping existing server..."
    kill $(lsof -t -i:3001) 2>/dev/null || true
    sleep 1
fi

echo "1️⃣  Starting Node.js WebSocket server (port 3000)..."
cd server
npm run dev > ../logs/server.log 2>&1 &
SERVER_PID=$!
cd ..

sleep 2

echo "2️⃣  Starting Next.js dashboard (port 3001)..."
cd web
npm run dev > ../logs/web.log 2>&1 &
WEB_PID=$!
cd ..

sleep 3

echo ""
echo "✅ Dashboard stack is running!"
echo ""
echo "📊 Dashboard:  http://localhost:3001/dashboard"
echo "🔌 WebSocket:  ws://localhost:3000/ws/orchestrator"
echo "🔧 API:        http://localhost:3000/api"
echo ""
echo "📝 Logs:"
echo "   Server: tail -f logs/server.log"
echo "   Web:    tail -f logs/web.log"
echo ""
echo "🧪 Test integration:"
echo "   python3 test_dashboard_integration.py"
echo ""
echo "🛑 Stop:"
echo "   kill $SERVER_PID $WEB_PID"
echo ""

# Save PIDs for easy cleanup
mkdir -p logs
echo "$SERVER_PID" > logs/server.pid
echo "$WEB_PID" > logs/web.pid

echo "Press Ctrl+C to stop all services..."
wait
