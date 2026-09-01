#!/bin/bash

# Auto-configure Telegram Bot for Pumba Tracker

BOT_TOKEN="7684249030:AAGPRUfWyxNClVFkvUrjusqtlID6Y-32gz8"
SERVER_URL=""

# Get server URL
read -p "Введи URL сервера (или оставь пустым для автоопределения): " INPUT_URL

if [ -n "$INPUT_URL" ]; then
    SERVER_URL="$INPUT_URL"
else
    # Try to get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
    if [ -n "$PUBLIC_IP" ]; then
        SERVER_URL="http://${PUBLIC_IP}:3000"
        echo "Определён публичный IP: $PUBLIC_IP"
    fi
fi

echo ""
echo "🤖 Настройка бота @work_work_hiaahgh_bot"
echo "📡 Сервер: $SERVER_URL"
echo ""

# Set bot commands
echo "1️⃣ Устанавливаю команды бота..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands" \
    -H "Content-Type: application/json" \
    -d '{
        "commands": [
            {"command": "start", "description": "Запустить Pumba Tracker"},
            {"command": "tasks", "description": "Мои задачи"},
            {"command": "workouts", "description": "Мои тренировки"},
            {"command": "habits", "description": "Мои привычки"},
            {"command": "journal", "description": "Дневник дня"},
            {"command": "stats", "description": "Статистика"}
        ]
    }' | jq -r '.description // "✅ Команды установлены"'

# Set menu button
echo ""
echo "2️⃣ Настраиваю кнопку меню..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \
    -H "Content-Type: application/json" \
    -d "{
        \"menu_button\": {
            \"type\": \"web_app\",
            \"text\": \"📱 Pumba Tracker\",
            \"web_app\": { \"url\": \"${SERVER_URL}\" }
        }
    }" | jq -r '.ok // "⚠️ Ошибка настройки меню"'

# Set default menu button for all users
echo ""
echo "3️⃣ Настраиваю дефолтную кнопку..."
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton" \
    -H "Content-Type: application/json" \
    -d "{
        \"menu_button\": {
            \"type\": \"web_app\",
            \"text\": \"📱 Pumba\",
            \"web_app\": { \"url\": \"${SERVER_URL}\" }
        }
    }"

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "Теперь:"
echo "1. Открой @work_work_hiaahgh_bot в Telegram"
echo "2. Отправь /start"
echo "3. Нажми кнопку '📱 Pumba Tracker' внизу"
echo ""
echo "Если кнопки нет — перезапусти Telegram"
