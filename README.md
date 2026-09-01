# Pumba Tracker v2.0 🐗

**Твоя система жизни.** Трекер продуктивности, тренировок, привычек и здоровья с голосовым управлением через Telegram.

## Возможности

### 📱 Голосовое управление
- Говори боту — он поймёт и запишет
- Распознавание речи через Google Speech API
- Автоматическая категоризация и анализ намерений

### 📝 Планнер
- Задачи с приоритетами и дедлайнами
- Категории: Работа, Здоровье, Быт, Саморазвитие
- Streak и прогресс

### 💪 Тренировки
- Упражнения с подходами, повторениями, весом
- История тренировок
- Группировка по мышечным группам

### 🌱 Привычки
- Выработка новых привычек
- Отказ от вредных
- Streak counter
- Прогресс в процентах

### 📔 Дневник дня
- Сон (часы, качество)
- Энергия и настроение
- Стресс
- Активности и заметки

### 📊 Аналитика
- Продуктивность по дням/неделям/месяцам
- Корреляции (сон vs настроение)
- Рекомендации на основе данных
- Еженедельные сводки

### 🍎 HealthKit (iOS)
- Интеграция с Apple Health
- Шаги, калории, пульс
- Автоматическая синхронизация через Shortcuts

## Архитектура

```
pumba-tracker/
├── server/
│   ├── server.js          # Express API + Telegram Bot
│   ├── package.json
│   └── .env               # Конфигурация
├── client/
│   ├── index.html         # Telegram Mini App
│   ├── app.js             # Frontend logic
│   ├── styles.css         # Стили
│   └── healthkit.js       # iOS Health integration
├── docker-compose.yml
└── Dockerfile
```

## Быстрый старт

### 1. Клонирование и установка
```bash
git clone <repo>
cd pumba-tracker/server
npm install
```

### 2. Конфигурация
```bash
cp .env.example .env
# Отредактируй .env:
# BOT_TOKEN=your_telegram_bot_token
# GOOGLE_API_KEY=your_google_api_key
```

### 3. Запуск
```bash
# Локально
npm start

# Или через Docker
docker-compose up -d
```

### 4. Настройка Telegram Bot
1. Найди бота: `@work_work_hiaahgh_bot`
2. Отправь `/start`
3. Открой Mini App через кнопку

## API Endpoints

### Tasks
- `GET /api/user/:telegramId` — все данные пользователя
- `POST /api/tasks` — создать задачу
- `PATCH /api/tasks/:id` — обновить задачу
- `DELETE /api/tasks/:id` — удалить задачу

### Workouts
- `POST /api/workouts` — создать тренировку
- `GET /api/workouts/:userId` — список тренировок
- `POST /api/workouts/:id/exercises` — добавить упражнение
- `POST /api/exercises/:id/sets` — добавить подход

### Habits
- `POST /api/habits` — создать привычку
- `GET /api/habits/:userId` — список привычек
- `POST /api/habits/:id/log` — отметить выполнение

### Journal
- `POST /api/journal` — записать день
- `GET /api/journal/:userId` — история

### Health
- `POST /api/health` — данные здоровья
- `GET /api/health/:userId` — история

### Analytics
- `GET /api/analytics/:userId?period=week|month|year`
- `GET /api/summary/:userId/weekly`

## Голосовые команды

Бот понимает контекст:
- **"Нужно сделать отчёт"** → Задача
- **"Тренировка: жим 100кг 3 подхода"** → Тренировка
- **"Привычка: читать 30 минут"** → Привычка
- **"Сегодня спал 8 часов, настроение 8"** → Дневник
- **"Фокус: закончить проект"** → Фокус дня

## HealthKit + Apple Shortcuts

Для автоматической отправки данных из Apple Health:

1. Создай Shortcut в приложении "Быстрые команды"
2. Добавь действие "Получить данные Health"
3. Добавь действие "Получить содержимое URL"
   - URL: `https://your-server.com/api/health`
   - Method: POST
   - Body: JSON с данными
4. Настрой автоматизацию по времени

## Переменные окружения

| Переменная | Описание | Обязательная |
|-----------|----------|-------------|
| `BOT_TOKEN` | Telegram Bot Token | Да |
| `GOOGLE_API_KEY` | Google Speech API Key | Да (для голоса) |
| `PORT` | Порт сервера | Нет (default: 3000) |
| `NODE_ENV` | Режим работы | Нет |
| `DB_PATH` | Путь к SQLite | Нет |

## Технологии

- **Backend**: Node.js, Express, SQLite
- **Frontend**: Vanilla JS, Chart.js, Telegram WebApp API
- **Voice**: Google Cloud Speech-to-Text
- **Bot**: node-telegram-bot-api
- **Deploy**: Docker, Docker Compose

## Лицензия

MIT

---

**Pumba** — не забывает за тебя. 🖤
