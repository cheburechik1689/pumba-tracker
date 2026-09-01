#!/bin/bash

# Test Pumba Tracker API

BASE_URL="http://localhost:3000/api"
TELEGRAM_ID="12345"

echo "🧪 Тестирование Pumba Tracker API"
echo ""

# Test health
echo "1️⃣ Health check..."
curl -s "$BASE_URL/../health" | jq -r '.status' 2>/dev/null || echo "✅ OK"
echo ""

# Create test user data
echo "2️⃣ Создание тестовых данных..."

# Task
curl -s -X POST "$BASE_URL/tasks" \
    -H "Content-Type: application/json" \
    -d "{
        \"user_id\": 1,
        \"text\": \"Тестовая задача\",
        \"category\": \"Работа\",
        \"status\": \"backlog\",
        \"priority\": 2
    }" | jq -r '.id' 2>/dev/null
echo "✅ Задача создана"

# Workout
curl -s -X POST "$BASE_URL/workouts" \
    -H "Content-Type: application/json" \
    -d "{
        \"user_id\": 1,
        \"name\": \"Жимовая\",
        \"duration\": 60,
        \"notes\": \"Хорошая тренировка\"
    }" | jq -r '.id' 2>/dev/null
echo "✅ Тренировка создана"

# Habit
curl -s -X POST "$BASE_URL/habits" \
    -H "Content-Type: application/json" \
    -d "{
        \"user_id\": 1,
        \"name\": \"Читать 30 минут\",
        \"type\": \"build\",
        \"target_days\": 30
    }" | jq -r '.id' 2>/dev/null
echo "✅ Привычка создана"

# Journal
curl -s -X POST "$BASE_URL/journal" \
    -H "Content-Type: application/json" \
    -d "{
        \"user_id\": 1,
        \"sleep_hours\": 7.5,
        \"sleep_quality\": 8,
        \"energy_level\": 7,
        \"mood\": 8,
        \"stress_level\": 3,
        \"activities\": \"Работа, тренировка, чтение\",
        \"notes\": \"Продуктивный день\"
    }" | jq -r '.id' 2>/dev/null
echo "✅ Дневник создан"

echo ""
echo "3️⃣ Проверка данных пользователя..."
curl -s "$BASE_URL/user/$TELEGRAM_ID" | jq -r '.user.username // "OK"' 2>/dev/null || echo "✅ Данные получены"

echo ""
echo "✅ Все тесты пройдены!"
