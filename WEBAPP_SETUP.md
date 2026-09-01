# Настройка Telegram WebApp для Pumba Tracker

## Шаг 1: Проверь сервер

```bash
cd /root/.openclaw/workspace/pumba-tracker
./pumba.sh status
```

Должно показать: ✅ Сервер работает

## Шаг 2: Открой @BotFather в Telegram

Отправь команду:
```
/menu
```

## Шаг 3: Выбери бота

Нажми на: `@work_work_hiaahgh_bot`

## Шаг 4: Настрой кнопку

Выбери: **Configure menu button**

Введи название:
```
📱 Pumba Tracker
```

Введи URL (замени IP на свой):
```
http://8.219.107.106:3000
```

> Если порт 3000 закрыт — используй ngrok (см. ниже)

## Шаг 5: Проверь

1. Найди бота `@work_work_hiaahgh_bot`
2. Отправь `/start`
3. Нажми кнопку `📱 Pumba Tracker` внизу

## Альтернатива: ngrok (если порт закрыт)

```bash
# Установка
snap install ngrok

# Регистрация (получи токен на ngrok.com)
ngrok config add-authtoken ТВОЙ_ТОКЕН

# Запуск туннеля
ngrok http 3000
```

В выводе будет URL типа `https://abc123.ngrok.io` — используй его в @BotFather.

## Проверка доступности

```bash
./check-access.sh
```

Этот скрипт проверит:
- Работает ли сервер локально
- Доступен ли он из интернета
- Предложит настроить ngrok если нужно
