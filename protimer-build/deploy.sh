#!/bin/bash
# ProTimer Deployment Script
# This script builds and prepares the application for production deployment

# Display colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}ProTimer Deployment Script${NC}"
echo "=============================="
echo ""

# Check if .env file exists, if not, create from example
if [ ! -f .env ]; then
  echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${YELLOW}Please edit the .env file with your actual credentials before proceeding.${NC}"
  echo "Press Enter to continue after editing, or Ctrl+C to cancel..."
  read
else
  echo -e "${GREEN}Found .env configuration file.${NC}"
fi

# Check for Node.js and npm
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js is not installed. Please install Node.js 18.x or later.${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}npm is not installed. Please install npm 8.x or later.${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2)
echo -e "${GREEN}Using Node.js version: ${NODE_VERSION}${NC}"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Clean previous build
echo ""
echo "Cleaning previous build..."
rm -rf dist

# Build application
echo ""
echo "Building application for production..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
  echo -e "${RED}Build failed. See error messages above.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}Build successful!${NC}"
echo ""
echo "The application has been built and is ready for deployment."
echo "Production files are located in the 'dist' directory."
echo ""
echo "To run the application:"
echo "  NODE_ENV=production node dist/index.js"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Make sure your environment variables are set correctly"
echo "in production, either through .env file or server environment."
echo ""
echo -e "${GREEN}Deployment preparation complete!${NC}"