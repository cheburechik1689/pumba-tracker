# 🌐 Постоянное решение: Домен + SSL

## Что уже настроено

✅ Nginx установлен и работает
✅ Прокси на порт 3000 настроен
✅ Certbot установлен (для Let's Encrypt SSL)

## Что нужно сделать

### Шаг 1: Купи домен

**Рекомендую Namecheap** (дешевле всего):
- Зайди на https://namecheap.com
- Найди домен (например: `pumba-tracker.com`, `pumba.app`, `pumba-life.com`)
- Цена: ~$8-15/год
- Оплата: карта / PayPal

**Альтернативы:**
- Cloudflare Registrar: ~$9/год, но только если уже есть аккаунт
- GoDaddy: дороже, ~$12-20/год

### Шаг 2: Настрой DNS

В панели управления доменом (Namecheap):

1. Зайди в **Advanced DNS**
2. Добавь A-запись:
   - Type: `A Record`
   - Host: `@`
   - Value: `8.219.107.106` (твой IP)
   - TTL: Automatic

3. Добавь A-запись для www:
   - Type: `A Record`
   - Host: `www`
   - Value: `8.219.107.106`
   - TTL: Automatic

### Шаг 3: Обнови nginx конфиг

Замени `server_name _;` на свой домен:

```bash
# Отредактируй конфиг
nano /etc/nginx/sites-available/pumba-tracker
```

Измени:
```nginx
server {
    listen 80;
    server_name pumba-tracker.com www.pumba-tracker.com;  # ТВОЙ ДОМЕН
    
    location / {
        proxy_pass http://localhost:3000;
        # ... остальное без изменений
    }
}
```

Перезапусти nginx:
```bash
nginx -t && nginx -s reload
```

### Шаг 4: Получи SSL (HTTPS)

```bash
certbot --nginx -d pumba-tracker.com -d www.pumba-tracker.com
```

Следуй инструкциям:
1. Введи email (для уведомлений о продлении)
2. Согласись с terms
3. Выбери: redirect HTTP to HTTPS

### Шаг 5: Проверь

```bash
# HTTP должно редиректить на HTTPS
curl -I http://pumba-tracker.com

# HTTPS должен работать
curl -I https://pumba-tracker.com
```

### Шаг 6: Настрой Telegram Bot

1. Открой @BotFather
2. Отправь `/menu`
3. Выбери `@work_work_hiaahgh_bot`
4. Configure menu button
5. Название: `📱 Pumba Tracker`
6. URL: `https://pumba-tracker.com` (твой домен)

## 💰 Итоговая стоимость

| Компонент | Стоимость |
|-----------|-----------|
| Домен | ~$8-15/год |
| SSL (Let's Encrypt) | $0 |
| Хостинг (твой сервер) | $0 |
| **Итого** | **~$10/год** |

## 🔒 Автообновление SSL

Certbot автоматически обновляет сертификат. Проверь:
```bash
certbot renew --dry-run
```

## 🆘 Если что-то не работает

1. Проверь DNS: `dig pumba-tracker.com +short` (должен показать твой IP)
2. Проверь nginx: `nginx -t`
3. Проверь сертификат: `openssl s_client -connect pumba-tracker.com:443`
4. Логи: `tail -f /var/log/nginx/error.log`

## 📋 Чеклист

- [ ] Куплен домен
- [ ] Настроены A-записи
- [ ] Обновлён nginx конфиг
- [ ] Получен SSL сертификат
- [ ] HTTPS работает
- [ ] Telegram WebApp настроен
- [ ] Голосовые сообщения тестируются

---

**После покупки домена — пришли мне его название, я всё настрою автоматически.**
