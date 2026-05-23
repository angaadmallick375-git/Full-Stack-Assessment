#!/bin/bash
# Build script for cross-platform compatibility
set -e

echo "📦 Installing server dependencies..."
npm install --prefix server

echo "📦 Installing client dependencies..."
npm install --prefix client

echo "🏗️ Building client..."
cd client
VITE_API_URL=/api npm run build
cd ..

echo "✅ Build complete!"
