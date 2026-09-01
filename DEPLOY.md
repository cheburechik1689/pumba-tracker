# Pumba Tracker v2.0 — Руководство по развёртыванию

## 🚀 Быстрый старт

### 1. Запуск сервера

```bash
cd /root/.openclaw/workspace/pumba-tracker

# Запуск
./pumba.sh start

# Проверка статуса
./pumba.sh status

# Логи
./pumba.sh logs

# Остановка
./pumba.sh stop
```

### 2. Настройка Google Speech API (для голоса)

```bash
./setup-google-speech.sh
# Введи API ключ от Google Cloud
```

### 3. Настройка Telegram WebApp

```bash
./configure-bot.sh
# Введи публичный URL сервера
```

Или вручную через @BotFather:
1. Отправь `/mybots`
2. Выбери `@work_work_hiaahgh_bot`
3. Bot Settings → Menu Button → Configure
4. Укажи URL: `https://your-server.com`

## 📁 Структура проекта

```
pumba-tracker/
├── server/
│   ├── server.js          # Express API + Telegram Bot
│   ├── package.json       # Зависимости
│   ├── .env               # Конфигурация (создай из .env.example)
│   └── data/
│       └── pumba.db       # SQLite база данных
├── client/
│   ├── index.html         # Telegram Mini App
│   ├── app.js             # Логика фронтенда
│   ├── styles.css         # Стили
│   └── healthkit.js       # iOS Health интеграция
├── pumba.sh               # Управление сервером
├── configure-bot.sh       # Настройка Telegram бота
├── setup-google-speech.sh # Настройка Google Speech
├── test-api.sh            # Тестирование API
├── docker-compose.yml     # Docker развёртывание
└── Dockerfile
```

## 🔌 API Endpoints

### Пользователь
- `GET /api/user/:telegramId` — Получить все данные пользователя

### Задачи (Планнер)
- `POST /api/tasks` — Создать задачу
- `PATCH /api/tasks/:id` — Обновить задачу
- `DELETE /api/tasks/:id` — Удалить задачу

### Тренировки
- `POST /api/workouts` — Создать тренировку
- `GET /api/workouts/:userId` — Список тренировок
- `POST /api/workouts/:id/exercises` — Добавить упражнение
- `POST /api/exercises/:id/sets` — Добавить подход
- `DELETE /api/exercises/:id` — Удалить упражнение
- `DELETE /api/sets/:id` — Удалить подход
- `DELETE /api/workouts/:id` — Удалить тренировку

### Привычки
- `POST /api/habits` — Создать привычку
- `GET /api/habits/:userId` — Список привычек (с streak и прогрессом)
- `POST /api/habits/:id/log` — Отметить выполнение
- `DELETE /api/habits/:id` — Удалить привычку

### Дневник
- `POST /api/journal` — Записать день
- `GET /api/journal/:userId` — История
- `GET /api/journal/:userId/range?start=...&end=...` — За период

### Здоровье
- `POST /api/health` — Данные здоровья
- `GET /api/health/:userId` — История

### Аналитика
- `GET /api/analytics/:userId?period=week|month|year` — Аналитика
- `GET /api/summary/:userId/weekly` — Еженедельная сводка

## 🎙️ Голосовые команды

Бот автоматически определяет намерение:

| Что говоришь | Что происходит |
|-------------|----------------|
| "Нужно сделать отчёт" | Создаётся задача |
| "Тренировка: жим 100кг" | Создаётся тренировка |
| "Привычка: читать 30 мин" | Создаётся привычка |
| "Сегодня спал 8 часов" | Запись в дневник |
| "Фокус: закончить проект" | Устанавливается фокус |

## 🍎 iOS HealthKit

### Через Apple Shortcuts:
1. Создай Shortcut с автоматизацией по времени
2. Добавь действие "Получить данные Health"
3. Отправь POST на `/api/health`

### Вручную в Mini App:
- Раздел "Дневник" → введи шаги/калории
- Или используй кнопку "Здоровье" в дашборде

## 🐳 Docker

```bash
# Сборка и запуск
docker-compose up -d

# Логи
docker-compose logs -f

# Остановка
docker-compose down
```

## 📊 Функционал

### ✅ Реализовано
- [x] Планнер задач с категориями
- [x] Трекер тренировок (упражнения, подходы, вес)
- [x] Трекер привычек (build/quit, streak, прогресс)
- [x] Дневник дня (сон, настроение, энергия, стресс)
- [x] Аналитика (неделя/месяц/год)
- [x] Корреляции и рекомендации
- [x] Еженедельные сводки
- [x] Голосовое управление
- [x] Telegram Mini App
- [x] iOS HealthKit интеграция

### 🔄 В планах
- [ ] Push-уведомления
- [ ] Экспорт данных
- [ ] AI-ассистент для анализа
- [ ] Социальные функции

## 🆘 Поддержка

Если что-то не работает:
1. Проверь логи: `./pumba.sh logs`
2. Проверь статус: `./pumba.sh status`
3. Перезапусти: `./pumba.sh restart`

---

**Pumba** — не забывает за тебя. 🖤
