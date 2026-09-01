#!/bin/bash

# Pumba Tracker Manager

ACTION="${1:-status}"
APP_DIR="/root/.openclaw/workspace/pumba-tracker"
SERVER_DIR="$APP_DIR/server"
PID_FILE="/tmp/pumba.pid"
LOG_FILE="/tmp/pumba.log"

case "$ACTION" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "✅ Сервер уже запущен (PID: $(cat $PID_FILE))"
            exit 0
        fi
        
        echo "🚀 Запуск Pumba Tracker..."
        cd "$SERVER_DIR"
        nohup node server.js > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        sleep 2
        
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Сервер запущен на http://localhost:3000"
            echo "🤖 Бот: @work_work_hiaahgh_bot"
        else
            echo "❌ Ошибка запуска"
            echo "📋 Логи: tail -f $LOG_FILE"
        fi
        ;;
        
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 "$PID" 2>/dev/null; then
                echo "🛑 Остановка сервера..."
                kill "$PID" 2>/dev/null
                sleep 1
            fi
            rm -f "$PID_FILE"
        fi
        # Kill any remaining node processes on port 3000
        lsof -ti:3000 | xargs kill -9 2>/dev/null
        echo "✅ Сервер остановлен"
        ;;
        
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
        
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "✅ Сервер работает (PID: $(cat $PID_FILE))"
            curl -s http://localhost:3000/health 2>/dev/null || echo "⚠️ Health check не отвечает"
        else
            echo "❌ Сервер не запущен"
        fi
        ;;
        
    logs)
        echo "📋 Логи сервера:"
        tail -n 50 "$LOG_FILE" 2>/dev/null || echo "Логи не найдены"
        ;;
        
    *)
        echo "Использование: $0 {start|stop|restart|status|logs}"
        ;;
esac
