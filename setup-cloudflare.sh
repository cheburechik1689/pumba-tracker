#!/bin/bash

echo "🌐 Настройка Cloudflare Tunnel для Pumba Tracker"
echo ""
echo "Это бесплатное постоянное решение с HTTPS"
echo ""

# Check if server is running
if ! curl -s --max-time 2 http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Сервер не запущен. Запускаю..."
    cd /root/.openclaw/workspace/pumba-tracker/server
    nohup node server.js > /tmp/pumba.log 2>&1 &
    sleep 3
fi

# Check if already authenticated
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "🔐 Нужно авторизоваться в Cloudflare"
    echo ""
    echo "1. Сейчас откроется ссылка в браузере (если есть)"
    echo "2. Или скопируй ссылку и открой вручную"
    echo "3. Авторизуйся в Cloudflare (можно бесплатный аккаунт)"
    echo "4. Выбери домен (или создай бесплатный)"
    echo ""
    
    cloudflared tunnel login
    
    echo ""
    echo "✅ Авторизация завершена"
fi

# Create tunnel
echo ""
echo "🚀 Создание туннеля..."
TUNNEL_NAME="pumba-tracker"

# Check if tunnel exists
EXISTING_TUNNEL=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

if [ -n "$EXISTING_TUNNEL" ]; then
    echo "✅ Туннель уже существует"
    TUNNEL_ID="$EXISTING_TUNNEL"
else
    echo "Создаю новый туннель: $TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME"
    TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
fi

if [ -z "$TUNNEL_ID" ]; then
    echo "❌ Не удалось создать/найти туннель"
    exit 1
fi

echo ""
echo "📋 Настройка маршрутизации..."

# Create config
cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: pumba.YOUR_DOMAIN.com
    service: http://localhost:3000
  - service: http_status:404
EOF

echo ""
echo "📝 Конфигурация создана: ~/.cloudflared/config.yml"
echo ""
echo "⚠️ ВАЖНО: Отредактируй конфиг и замени YOUR_DOMAIN.com"
echo ""
echo "Варианты домена:"
echo "1. Купи домен (namecheap.com ~$3/год)"
echo "2. Используй существующий"
echo "3. Или используй бесплатный поддомен trycloudflare.com"
echo ""

# Option for quick tunnel (temporary but easy)
echo "🚀 Альтернатива: быстрый туннель (временный URL)"
echo ""
read -p "Запустить быстрый туннель? (y/n): " QUICK

if [ "$QUICK" = "y" ]; then
    echo ""
    echo "Запускаю..."
    echo ""
    
    # Kill existing cloudflared
    pkill -f "cloudflared tunnel" 2>/dev/null
    sleep 1
    
    # Run quick tunnel
    cloudflared tunnel --url http://localhost:3000 > /tmp/cloudflared.log 2>&1 &
    CLOUDFLARED_PID=$!
    
    sleep 5
    
    # Extract URL
    TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log | head -1)
    
    if [ -n "$TUNNEL_URL" ]; then
        echo ""
        echo "✅ Готово!"
        echo ""
        echo "🌐 HTTPS URL: $TUNNEL_URL"
        echo ""
        echo "📱 Действия:"
        echo "1. Открой @BotFather в Telegram"
        echo "2. Отправь: /menu"
        echo "3. Выбери: @work_work_hiaahgh_bot"
        echo "4. Configure menu button"
        echo "5. Название: 📱 Pumba Tracker"
        echo "6. URL: $TUNNEL_URL"
        echo ""
        echo "⚠️ Этот URL временный. После перезапуска изменится."
        echo "Для постоянного URL нужен свой домен."
        echo ""
        
        # Save URL to file
        echo "$TUNNEL_URL" > /tmp/pumba-tunnel-url.txt
        
        read -p "Нажми Enter для завершения..."
        wait $CLOUDFLARED_PID
    else
        echo "❌ Туннель не запустился. Проверь лог:"
        tail -20 /tmp/cloudflared.log
    fi
else
    echo ""
    echo "📖 Для постоянного решения:"
    echo ""
    echo "1. Купи домен (например pumba-tracker.com)"
    echo "2. Настрой DNS в Cloudflare"
    echo "3. Отредактируй ~/.cloudflared/config.yml"
    echo "4. Запусти: cloudflared tunnel route dns $TUNNEL_ID pumba.YOUR_DOMAIN.com"
    echo "5. Запусти: cloudflared tunnel run $TUNNEL_NAME"
    echo ""
    echo "Подробнее: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps"
fi
