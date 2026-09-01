#!/bin/bash

echo "🔍 Проверка доступности Pumba Tracker"
echo ""

LOCAL_IP=$(hostname -I | awk '{print $1}')
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null)

echo "Локальный IP: $LOCAL_IP"
echo "Публичный IP: $PUBLIC_IP"
echo ""

# Check if server is running
echo "1️⃣ Проверка локального сервера..."
if curl -s --max-time 3 http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Сервер работает локально"
else
    echo "❌ Сервер не запущен. Запусти: ./pumba.sh start"
    exit 1
fi

# Check public access
echo ""
echo "2️⃣ Проверка публичного доступа..."
if curl -s --max-time 5 "http://$PUBLIC_IP:3000/health" > /dev/null 2>&1; then
    echo "✅ Сервер доступен из интернета"
    echo "   URL: http://$PUBLIC_IP:3000"
else
    echo "⚠️ Сервер НЕ доступен из интернета"
    echo ""
    echo "Возможные причины:"
    echo "  - Порт 3000 закрыт фаерволом"
    echo "  - Нет публичного IP"
    echo "  - Провайдер блокирует порты"
    echo ""
    echo "Решения:"
    echo "  1. Открыть порт 3000 в фаерволе"
    echo "  2. Использовать ngrok для туннеля"
    echo "  3. Настроить nginx reverse proxy"
    echo ""
    
    read -p "Настроить ngrok? (y/n): " USE_NGROK
    if [ "$USE_NGROK" = "y" ]; then
        echo ""
        echo "Установка ngrok..."
        if ! command -v ngrok &> /dev/null; then
            curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
            echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | tee /etc/apt/sources.list.d/ngrok.list
            apt update && apt install -y ngrok
        fi
        
        read -p "Введи токен ngrok (получи на ngrok.com): " NGROK_TOKEN
        ngrok config add-authtoken "$NGROK_TOKEN"
        
        echo ""
        echo "Запуск ngrok..."
        ngrok http 3000 &
        sleep 3
        
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4)
        
        if [ -n "$NGROK_URL" ]; then
            echo ""
            echo "✅ Ngrok запущен!"
            echo "🌐 Публичный URL: $NGROK_URL"
            echo ""
            echo "Используй этот URL в @BotFather для WebApp"
        fi
    fi
fi

echo ""
echo "📋 Инструкция для @BotFather:"
echo ""
echo "1. Открой @BotFather в Telegram"
echo "2. Отправь: /menu"
echo "3. Выбери: @work_work_hiaahgh_bot"
echo "4. Нажми: Configure menu button"
echo "5. Введи название: 📱 Pumba Tracker"
echo "6. Введи URL: http://$PUBLIC_IP:3000"
echo "   (или ngrok URL если настроил)"
