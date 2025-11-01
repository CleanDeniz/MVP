#!/usr/bin/env bash
set -e

echo "=== 🧱 Installing client dependencies ==="
npm install --prefix client

echo "=== 🔧 Fixing vite permissions ==="
chmod +x ./client/node_modules/.bin/vite

echo "=== ⚡ Building client ==="
cd client
npx vite build
cd ..

echo "=== 🧩 Installing server dependencies ==="
npm install --prefix server

echo "✅ Build complete!"
