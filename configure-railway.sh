#!/bin/bash

# Telegram Bot Configuration Script
# Usage: ./configure-telegram-railway.sh

BOT_TOKEN="7684249030:AAGPRUfWyxNClVFkvUrjusqtlID6Y-32gz8"
WEBAPP_URL="https://pumba-tracker.up.railway.app"

echo "🤖 Настройка Telegram Bot для Railway"
echo ""
echo "URL: $WEBAPP_URL"
echo ""

# Set commands
echo "📋 Установка команд..."
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setMyCommands" \
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
  }' | grep -o '"ok":true' && echo "✅ Команды установлены" || echo "❌ Ошибка установки команд"

# Set menu button
echo ""
echo "📱 Настройка Menu Button..."
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{
    \"menu_button\": {
      \"type\": \"web_app\",
      \"text\": \"📱 Pumba Tracker\",
      \"web_app\": {\"url\": \"$WEBAPP_URL\"}
    }
  }" | grep -o '"ok":true' && echo "✅ Menu Button настроен" || echo "❌ Ошибка настройки Menu Button"

# Set webhook for bot
echo ""
echo "🔗 Настройка Webhook..."
curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$WEBAPP_URL/webhook\"}" | grep -o '"ok":true' && echo "✅ Webhook настроен" || echo "❌ Ошибка настройки Webhook"

echo ""
echo "🎉 Готово!"
echo ""
echo "Проверь бота: @work_work_hiaahgh_bot"
echo ""
