#!/bin/bash

echo "🚀 Запуск Pumba Tracker с HTTPS через ngrok"
echo ""

# Check if server is running
if ! curl -s --max-time 2 http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Сервер не запущен. Запускаю..."
    cd /root/.openclaw/workspace/pumba-tracker/server
    nohup node server.js > /tmp/pumba.log 2>&1 &
    sleep 3
fi

# Check ngrok auth
if ! grep -q "authtoken" ~/.config/ngrok/ngrok.yml 2>/dev/null; then
    echo "⚠️ Ngrok не настроен. Нужен токен."
    echo ""
    echo "1. Зарегистрируйся на https://ngrok.com (бесплатно)"
    echo "2. Получи токен в личном кабинете"
    echo ""
    read -p "Введи токен ngrok: " TOKEN
    
    if [ -n "$TOKEN" ]; then
        ngrok config add-authtoken "$TOKEN"
        echo "✅ Токен сохранён"
    else
        echo "❌ Токен не введён. Выход."
        exit 1
    fi
fi

# Kill existing ngrok
pkill -f "ngrok http" 2>/dev/null
sleep 1

echo "🌐 Запуск ngrok туннеля..."
ngrok http 3000 --log=stdout > /tmp/ngrok.log &
NGROK_PID=$!

sleep 4

# Get public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NGROK_URL" ]; then
    echo ""
    echo "✅ Готово!"
    echo ""
    echo "🌐 HTTPS URL: $NGROK_URL"
    echo ""
    echo "📱 Действия:"
    echo "1. Открой @BotFather в Telegram"
    echo "2. Отправь: /menu"
    echo "3. Выбери: @work_work_hiaahgh_bot"
    echo "4. Configure menu button"
    echo "5. Название: 📱 Pumba Tracker"
    echo "6. URL: $NGROK_URL"
    echo ""
    echo "⚠️ Важно: ngrok URL меняется при перезапуске."
    echo "Для постоянного URL нужен платный тариф или свой домен."
    echo ""
    read -p "Нажми Enter для завершения..."
else
    echo "❌ Ngrok не запустился. Проверь лог:"
    tail -20 /tmp/ngrok.log
fi

# Keep script running
wait $NGROK_PID
