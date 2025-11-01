#!/usr/bin/env bash
set -e

echo "🚀 Building React client for Render..."

# Устанавливаем зависимости
npm install

# Даем права на исполнение vite
chmod +x ./node_modules/.bin/vite

# Собираем билд
npx vite build

echo "✅ Frontend built successfully!"
