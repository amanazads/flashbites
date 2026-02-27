#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🍔 Starting FlashBites Application...${NC}\n"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node --version)${NC}"
echo -e "${GREEN}✅ npm version: $(npm --version)${NC}\n"

# Start the backend server
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait a bit for server to start
sleep 3

# Start the frontend
echo -e "${BLUE}🎨 Starting Frontend Application...${NC}"
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo -e "\n${GREEN}✅ FlashBites is running!${NC}"
echo -e "${BLUE}📡 Backend: http://localhost:5000${NC}"
echo -e "${BLUE}🎨 Frontend: http://localhost:3000${NC}\n"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}\n"

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
