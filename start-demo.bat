@echo off
title MVP Bonus Platform - Auto Start
color 0A

echo ============================================
echo   🚀 Запуск локального MVP (Backend + Front)
echo   и туннелей ngrok для Telegram Mini App
echo ============================================
echo.

:: === Убиваем старые процессы ngrok ===
taskkill /F /IM ngrok.exe >nul 2>&1

:: === Запуск backend ===
echo [1/4] Запуск сервера (Node.js)...
start cmd /k "cd server && npm run dev"

:: === Небольшая пауза, чтобы сервер успел стартовать ===
timeout /t 5 /nobreak >nul

:: === Запуск ngrok для backend ===
echo [2/4] Подключаем ngrok к backend (порт 3001)...
start cmd /k "ngrok http 3001"

:: === Запуск frontend ===
echo [3/4] Запуск клиента (Vite)...
start cmd /k "cd client && npm run dev"

:: === Небольшая пауза, чтобы Vite запустился ===
timeout /t 5 /nobreak >nul

:: === Запуск ngrok для frontend ===
echo [4/4] Подключаем ngrok к frontend (порт 5173)...
start cmd /k "ngrok http 5173"

echo.
echo ============================================
echo ✅ Все процессы запущены!
echo    - Backend: http://localhost:3001
echo    - Frontend: http://localhost:5173
echo.
echo    Проверь ссылки в окне ngrok для HTTPS-туннелей.
echo    Вставь фронтовый URL в Telegram (BotFather).
echo ============================================
pause
