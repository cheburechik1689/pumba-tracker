#!/bin/bash

echo "🎙️ Настройка Google Speech API для Pumba Tracker"
echo ""
echo "Шаги:"
echo ""
echo "1. Перейди в Google Cloud Console:"
echo "   https://console.cloud.google.com/"
echo ""
echo "2. Создай новый проект (или используй существующий)"
echo ""
echo "3. Включи Speech-to-Text API:"
echo "   APIs & Services > Library > Search 'Speech-to-Text' > Enable"
echo ""
echo "4. Создай API ключ:"
echo "   APIs & Services > Credentials > Create Credentials > API Key"
echo ""
echo "5. Ограничь ключ (рекомендуется):"
echo "   - Application restrictions: HTTP referrers или IP addresses"
echo "   - API restrictions: Speech-to-Text API only"
echo ""
echo "6. Добавь ключ в .env файл:"
echo "   GOOGLE_API_KEY=your_key_here"
echo ""

read -p "Введи API ключ: " API_KEY

if [ -n "$API_KEY" ]; then
    ENV_FILE="/root/.openclaw/workspace/pumba-tracker/server/.env"
    
    # Update or add GOOGLE_API_KEY
    if grep -q "GOOGLE_API_KEY=" "$ENV_FILE"; then
        sed -i "s/GOOGLE_API_KEY=.*/GOOGLE_API_KEY=$API_KEY/" "$ENV_FILE"
    else
        echo "GOOGLE_API_KEY=$API_KEY" >> "$ENV_FILE"
    fi
    
    echo "✅ API ключ сохранён"
    echo "🔄 Перезапусти сервер: ./pumba.sh restart"
else
    echo "❌ Ключ не введён"
fi
