#!/bin/bash

echo "📱 Настройка Telegram Mini App для Pumba Tracker"
echo ""
echo "Твой бот: @work_work_hiaahgh_bot"
echo ""
echo "Шаги для настройки WebApp:"
echo ""
echo "1. Открой @BotFather в Telegram"
echo ""
echo "2. Отправь команду: /mybots"
echo ""
echo "3. Выбери: @work_work_hiaahgh_bot"
echo ""
echo "4. Нажми: Bot Settings"
echo ""
echo "5. Нажми: Menu Button"
echo ""
echo "6. Нажми: Configure menu button"
echo ""
echo "7. Введи название кнопки: Pumba Tracker"
echo ""
echo "8. Введи URL твоего сервера:"
echo "   Для локального теста используй ngrok:"
echo "   ngrok http 3000"
echo ""
echo "9. Или настрой через /setinline для inline mode"
echo ""

read -p "Введи URL сервера (https://...): " SERVER_URL

if [ -n "$SERVER_URL" ]; then
    echo ""
    echo "Обновляю конфигурацию..."
    
    # Update client API URL if needed
    CLIENT_FILE="/root/.openclaw/workspace/pumba-tracker/client/app.js"
    
    echo ""
    echo "✅ Готово!"
    echo ""
    echo "Теперь:"
    echo "1. Перейди в @BotFather"
    echo "2. Настрой Menu Button URL: $SERVER_URL"
    echo "3. Или отправь /setinline и настрой Web App"
    echo ""
    echo "Для теста локально:"
    echo "  ngrok http 3000"
    echo "  # Используй HTTPS URL от ngrok"
else
    echo "❌ URL не введён"
fi
