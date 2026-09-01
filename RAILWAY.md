# Railway Deployment Guide

## Шаг 1: Подготовка

Убедись, что у тебя есть:
- Аккаунт GitHub
- Аккаунт Railway (через GitHub)

## Шаг 2: Создай репозиторий на GitHub

1. Зайди на https://github.com/new
2. Название: `pumba-tracker`
3. Приватный или публичный — не важно
4. Нажми **Create repository**

## Шаг 3: Загрузи код

В терминале (на сервере):

```bash
cd /root/.openclaw/workspace/pumba-tracker

# Инициализируй git
git init
git add .
git commit -m "Initial commit"

# Добавь удалённый репозиторий (замени USERNAME)
git remote add origin https://github.com/USERNAME/pumba-tracker.git

# Загрузи код
git push -u origin main
```

## Шаг 4: Деплой на Railway

1. Зайди на https://railway.com/dashboard
2. Нажми **New Project**
3. Выбери **Deploy from GitHub repo**
4. Найди `pumba-tracker` и выбери
5. Нажми **Deploy**

Railway автоматически:
- Установит зависимости
- Запустит сервер
- Выдаст HTTPS URL
- Настроит домен

## Шаг 5: Настрой переменные окружения

В Railway dashboard:
1. Перейди в проект
2. Нажми **Variables**
3. Добавь:
   - `BOT_TOKEN` = `7684249030:AAGPRUfWyxNClVFkvUrjusqtlID6Y-32gz8`
   - `GOOGLE_API_KEY` = (получишь позже)
   - `PORT` = `3000`

## Шаг 6: Получи URL

После деплоя Railway даст тебе URL:
```
https://pumba-tracker-production.up.railway.app
```

## Шаг 7: Настрой Telegram Bot

1. Открой @BotFather
2. Отправь `/menu`
3. Выбери `@work_work_hiaahgh_bot`
4. Configure menu button
5. Название: `📱 Pumba Tracker`
6. URL: `https://pumba-tracker-production.up.railway.app`

## Готово! 🎉

## Обновление кода

После изменений:
```bash
git add .
git commit -m "Update"
git push
```

Railway автоматически перезадеплоит.

## Альтернатива: Railway CLI

```bash
# Установка
npm install -g @railway/cli

# Логин
railway login

# Привязка к проекту
railway link

# Деплой
railway up
```
