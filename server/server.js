const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '7684249030:AAGPRUfWyxNClVFkvUrjusqtlID6Y-32gz8';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Database - Railway compatible
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'pumba.db')
  : path.join(__dirname, 'data', 'pumba.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath);

console.log('📁 Database path:', dbPath);

// ========== DATABASE SCHEMA ==========
db.serialize(() => {
    // Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tasks (планнер)
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        text TEXT NOT NULL,
        category TEXT DEFAULT 'Без категории',
        status TEXT DEFAULT 'backlog',
        priority INTEGER DEFAULT 1,
        due_date TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Workouts (тренировки)
    db.run(`CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT NOT NULL,
        name TEXT,
        duration INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Exercises (упражнения в тренировке)
    db.run(`CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER,
        name TEXT NOT NULL,
        muscle_group TEXT,
        FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    )`);

    // Sets (подходы)
    db.run(`CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id INTEGER,
        reps INTEGER,
        weight REAL,
        rpe INTEGER,
        notes TEXT,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    )`);

    // Habits (привычки)
    db.run(`CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('build', 'quit')) DEFAULT 'build',
        target_days INTEGER DEFAULT 30,
        color TEXT DEFAULT '#4a9eff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Habit logs
    db.run(`CREATE TABLE IF NOT EXISTS habit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id INTEGER,
        date TEXT,
        status TEXT CHECK(status IN ('done', 'missed', 'partial')) DEFAULT 'done',
        notes TEXT,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    )`);

    // Daily journal (дневник дня)
    db.run(`CREATE TABLE IF NOT EXISTS journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT UNIQUE,
        sleep_hours REAL,
        sleep_quality INTEGER,
        energy_level INTEGER,
        mood INTEGER,
        stress_level INTEGER,
        activities TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Health data (HealthKit / Google Fit)
    db.run(`CREATE TABLE IF NOT EXISTS health_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        steps INTEGER,
        calories_burned INTEGER,
        active_minutes INTEGER,
        heart_rate_avg REAL,
        heart_rate_max REAL,
        distance REAL,
        source TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Wellness (самочувствие)
    db.run(`CREATE TABLE IF NOT EXISTS wellness (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        score INTEGER,
        context TEXT,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Insights
    db.run(`CREATE TABLE IF NOT EXISTS insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        text TEXT NOT NULL,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Focus
    db.run(`CREATE TABLE IF NOT EXISTS focus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        text TEXT NOT NULL,
        date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Voice messages
    db.run(`CREATE TABLE IF NOT EXISTS voice_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        file_id TEXT,
        transcription TEXT,
        parsed_intent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Weekly summaries (AI-generated)
    db.run(`CREATE TABLE IF NOT EXISTS weekly_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        week_start TEXT,
        summary TEXT,
        correlations TEXT,
        recommendations TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
});

// ========== TELEGRAM BOT ==========
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function getOrCreateUser(telegramId, profile) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(row);
            db.run(
                'INSERT INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)',
                [telegramId, profile.username, profile.first_name, profile.last_name],
                function(err) {
                    if (err) return reject(err);
                    resolve({ id: this.lastID, telegram_id: telegramId, ...profile });
                }
            );
        });
    });
}

// Speech-to-Text
async function transcribeVoice(fileUrl) {
    if (!GOOGLE_API_KEY) throw new Error('Google API Key not configured');
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const audioBase64 = Buffer.from(response.data, 'binary').toString('base64');
    
    const speechResponse = await axios.post(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
        {
            config: {
                encoding: 'OGG_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'ru-RU',
                alternativeLanguageCodes: ['en-US'],
                enableAutomaticPunctuation: true,
                model: 'latest_long'
            },
            audio: { content: audioBase64 }
        }
    );

    const results = speechResponse.data.results;
    if (!results?.length) throw new Error('No speech detected');
    return results[0].alternatives[0].transcript;
}

// Advanced intent parsing
function parseIntent(text) {
    const lower = text.toLowerCase();
    
    // Workout patterns
    const workoutPatterns = [
        /тренировка[\s:]*(.+)/i,
        /зал[\s:]*(.+)/i,
        /жим[\s:]*(.+)/i,
        /присед[\s:]*(.+)/i,
        /тянул[\s:]*(.+)/i,
        /бег[\s:]*(.+)/i
    ];
    for (const pattern of workoutPatterns) {
        const match = text.match(pattern);
        if (match) return { type: 'workout', text: match[1]?.trim() || text };
    }

    // Habit patterns
    const habitPatterns = [
        /привычка[\s:]*(.+)/i,
        /каждый день[\s:]*(.+)/i,
        /перестать[\s:]*(.+)/i,
        /бросить[\s:]*(.+)/i,
        /начать[\s:]*(.+)/i
    ];
    for (const pattern of habitPatterns) {
        const match = text.match(pattern);
        if (match) return { type: 'habit', text: match[1].trim() };
    }

    // Journal patterns
    const journalPatterns = [
        /сегодня[\s:]*(.+)/i,
        /день[\s:]*(.+)/i,
        /спал[\s:]*(\d+)/i,
        /сон[\s:]*(\d+)/i,
        /настроение[\s:]*(\d+)/i
    ];
    for (const pattern of journalPatterns) {
        const match = text.match(pattern);
        if (match) return { type: 'journal', text: match[1]?.trim() || text };
    }

    // Task patterns
    const taskPatterns = [
        /нужно\s+(.+)/i,
        /задача[\s:]*(.+)/i,
        /сделать\s+(.+)/i,
        /надо\s+(.+)/i,
        /добавь\s+(.+)/i,
        /запомни\s+(.+)/i
    ];
    for (const pattern of taskPatterns) {
        const match = text.match(pattern);
        if (match) return { type: 'task', text: match[1].trim() };
    }

    // Wellness patterns
    const wellnessPatterns = [
        /самочувствие[\s:]*(\d+)/i,
        /оценка[\s:]*(\d+)/i,
        /чувствую себя[\s:]*(\d+)/i
    ];
    for (const pattern of wellnessPatterns) {
        const match = text.match(pattern);
        if (match) return { type: 'wellness', score: parseInt(match[1]), context: text };
    }

    // Focus patterns
    const focusPatterns = [
        /фокус[\s:]*(.+)/i,
        /цель[\s:]*(.+)/i,
        /приоритет[\s:]*(.+)/i
    ];
    for (const pattern of focusPatterns) {
        const match = text.match(pattern);
        if (match) return { type: 'focus', text: match[1].trim() };
    }

    return { type: 'insight', text: text };
}

function categorizeTask(text) {
    const categories = {
        'Работа': ['работа', 'проект', 'клиент', 'звонок', 'встреча', 'дедлайн', 'отчет', 'презентация', 'email', 'письмо'],
        'Здоровье/Спорт': ['тренировка', 'спорт', 'зал', 'бег', 'йога', 'плавание', 'врач', 'здоровье', 'витамины', 'бассейн'],
        'Быт': ['ремонт', 'уборка', 'магазин', 'продукты', 'готовка', 'стирка', 'дом', 'квартира', 'машина'],
        'Саморазвитие': ['книга', 'учеба', 'курс', 'язык', 'медитация', 'чтение', 'обучение', 'навык', 'статья']
    };
    const lower = text.toLowerCase();
    for (const [cat, keywords] of Object.entries(categories)) {
        if (keywords.some(k => lower.includes(k))) return cat;
    }
    return 'Без категории';
}

// Bot handlers
bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    const userProfile = {
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
    };

    try {
        const user = await getOrCreateUser(msg.from.id, userProfile);
        const processingMsg = await bot.sendMessage(chatId, '🎙️ Распознаю голос...');

        const fileId = msg.voice.file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

        let transcription;
        try {
            transcription = await transcribeVoice(fileUrl);
        } catch (err) {
            await bot.editMessageText('❌ Ошибка распознавания. Проверь настройки Google API.', {
                chat_id: chatId,
                message_id: processingMsg.message_id
            });
            return;
        }

        const intent = parseIntent(transcription);
        const today = new Date().toISOString().split('T')[0];
        let responseText = '';

        switch (intent.type) {
            case 'task':
                const category = categorizeTask(intent.text);
                db.run('INSERT INTO tasks (user_id, text, category, status, date) VALUES (?, ?, ?, ?, ?)',
                    [user.id, intent.text, category, 'backlog', today]);
                responseText = `✅ Задача: "${intent.text}"\n📁 ${category}`;
                break;

            case 'workout':
                db.run('INSERT INTO workouts (user_id, date, name, notes) VALUES (?, ?, ?, ?)',
                    [user.id, today, 'Тренировка', intent.text]);
                responseText = `💪 Тренировка записана: "${intent.text}"\n\nОткрой Mini App, чтобы добавить подходы и вес.`;
                break;

            case 'habit':
                const habitType = /перестать|бросить|убрать|меньше/.test(intent.text) ? 'quit' : 'build';
                db.run('INSERT INTO habits (user_id, name, type) VALUES (?, ?, ?)',
                    [user.id, intent.text, habitType]);
                responseText = habitType === 'build' 
                    ? `🌱 Привычка на выработку: "${intent.text}"`
                    : `🚫 Привычка на отказ: "${intent.text}"`;
                break;

            case 'journal':
                db.run('INSERT INTO journal (user_id, date, notes) VALUES (?, ?, ?)',
                    [user.id, today, intent.text]);
                responseText = `📔 Запись в дневнике сохранена.`;
                break;

            case 'wellness':
                const score = intent.score || 5;
                db.run('INSERT INTO wellness (user_id, score, context, date) VALUES (?, ?, ?, ?)',
                    [user.id, score, intent.context, today]);
                responseText = `💭 Самочувствие: ${score}/10`;
                break;

            case 'focus':
                db.run('INSERT INTO focus (user_id, text, date) VALUES (?, ?, ?)',
                    [user.id, intent.text, today]);
                responseText = `🎯 Фокус: "${intent.text}"`;
                break;

            default:
                db.run('INSERT INTO insights (user_id, text, date) VALUES (?, ?, ?)',
                    [user.id, intent.text, today]);
                responseText = `💡 Мысль сохранена.`;
        }

        db.run('INSERT INTO voice_messages (user_id, file_id, transcription, parsed_intent) VALUES (?, ?, ?, ?)',
            [user.id, fileId, transcription, JSON.stringify(intent)]);

        const miniAppUrl = `https://t.me/${(await bot.getMe()).username}?startapp`;
        await bot.editMessageText(
            `${responseText}\n\n📝 "${transcription}"`,
            {
                chat_id: chatId,
                message_id: processingMsg.message_id,
                reply_markup: {
                    inline_keyboard: [[
                        { text: '📱 Открыть Pumba Tracker', web_app: { url: miniAppUrl } }
                    ]]
                }
            }
        );
    } catch (error) {
        console.error('Voice processing error:', error);
        bot.sendMessage(chatId, '❌ Ошибка. Попробуй ещё раз.');
    }
});

bot.on('text', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        const welcome = `Привет, ${msg.from.first_name}! 👋\n\n` +
            `Я Pumba — твоя система жизни.\n\n` +
            `🎙️ Говори мне голосом — я пойму и запишу:\n` +
            `• Задачи и планы\n` +
            `• Тренировки (упражнения, вес, подходы)\n` +
            `• Привычки (что вырабатываем / бросаем)\n` +
            `• Дневник дня (сон, настроение, дела)\n` +
            `• Мысли и инсайты\n\n` +
            `📊 Каждую неделю — сводка с аналитикой и советами.`;
        
        const miniAppUrl = `https://t.me/${(await bot.getMe()).username}?startapp`;
        bot.sendMessage(chatId, welcome, {
            reply_markup: {
                inline_keyboard: [[
                    { text: '📱 Открыть Pumba Tracker', web_app: { url: miniAppUrl } }
                ]]
            }
        });
        return;
    }

    const userProfile = {
        username: msg.from.username,
        first_name: msg.from.first_name,
        last_name: msg.from.last_name
    };

    try {
        const user = await getOrCreateUser(msg.from.id, userProfile);
        const intent = parseIntent(text);
        const today = new Date().toISOString().split('T')[0];

        switch (intent.type) {
            case 'task':
                const cat = categorizeTask(intent.text);
                db.run('INSERT INTO tasks (user_id, text, category, status, date) VALUES (?, ?, ?, ?, ?)',
                    [user.id, intent.text, cat, 'backlog', today]);
                bot.sendMessage(chatId, `✅ Задача: "${intent.text}"\n📁 ${cat}`);
                break;

            case 'workout':
                db.run('INSERT INTO workouts (user_id, date, name, notes) VALUES (?, ?, ?, ?)',
                    [user.id, today, 'Тренировка', intent.text]);
                bot.sendMessage(chatId, `💪 Тренировка записана. Добавь детали в Mini App.`);
                break;

            case 'habit':
                const hType = /перестать|бросить|убрать/.test(intent.text) ? 'quit' : 'build';
                db.run('INSERT INTO habits (user_id, name, type) VALUES (?, ?, ?)',
                    [user.id, intent.text, hType]);
                bot.sendMessage(chatId, hType === 'build' 
                    ? `🌱 Привычка: "${intent.text}"`
                    : `🚫 Отказ от: "${intent.text}"`);
                break;

            case 'journal':
                db.run('INSERT INTO journal (user_id, date, notes) VALUES (?, ?, ?)',
                    [user.id, today, intent.text]);
                bot.sendMessage(chatId, `📔 Дневник обновлён.`);
                break;

            default:
                db.run('INSERT INTO insights (user_id, text, date) VALUES (?, ?, ?)',
                    [user.id, text, today]);
                bot.sendMessage(chatId, `💡 Сохранено.`);
        }
    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, '❌ Ошибка.');
    }
});

// ========== API ROUTES ==========

// Get full user data
app.get('/api/user/:telegramId', (req, res) => {
    const { telegramId } = req.params;
    
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userId = user.id;
        const result = { user };

        const tables = [
            { name: 'tasks', query: 'SELECT * FROM tasks WHERE user_id = ? ORDER BY date DESC, created_at DESC' },
            { name: 'workouts', query: 'SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC' },
            { name: 'habits', query: 'SELECT * FROM habits WHERE user_id = ? ORDER BY created_at DESC' },
            { name: 'journal', query: 'SELECT * FROM journal WHERE user_id = ? ORDER BY date DESC' },
            { name: 'health_data', query: 'SELECT * FROM health_data WHERE user_id = ? ORDER BY date DESC' },
            { name: 'wellness', query: 'SELECT * FROM wellness WHERE user_id = ? ORDER BY date DESC' },
            { name: 'insights', query: 'SELECT * FROM insights WHERE user_id = ? ORDER BY date DESC' },
            { name: 'focus', query: 'SELECT * FROM focus WHERE user_id = ? ORDER BY date DESC' }
        ];

        let pending = tables.length;
        tables.forEach(({ name, query }) => {
            db.all(query, [userId], (err, rows) => {
                result[name] = rows || [];
                if (--pending === 0) res.json(result);
            });
        });
    });
});

// ========== TASKS ==========
app.post('/api/tasks', (req, res) => {
    const { user_id, text, category, status, priority, due_date, date } = req.body;
    db.run(
        'INSERT INTO tasks (user_id, text, category, status, priority, due_date, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user_id, text, category || 'Без категории', status || 'backlog', priority || 1, due_date, date || new Date().toISOString().split('T')[0]],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.patch('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.run(`UPDATE tasks SET ${fields} WHERE id = ?`, [...Object.values(updates), id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

app.delete('/api/tasks/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// ========== WORKOUTS ==========
app.post('/api/workouts', (req, res) => {
    const { user_id, date, name, duration, notes } = req.body;
    db.run(
        'INSERT INTO workouts (user_id, date, name, duration, notes) VALUES (?, ?, ?, ?, ?)',
        [user_id, date || new Date().toISOString().split('T')[0], name, duration, notes],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/workouts/:userId', (req, res) => {
    db.all('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC', [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/workouts/:workoutId/exercises', (req, res) => {
    const { workoutId } = req.params;
    db.all('SELECT * FROM exercises WHERE workout_id = ?', [workoutId], (err, exercises) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let pending = exercises.length;
        if (pending === 0) return res.json([]);
        
        exercises.forEach(ex => {
            db.all('SELECT * FROM sets WHERE exercise_id = ?', [ex.id], (err, sets) => {
                ex.sets = sets || [];
                if (--pending === 0) res.json(exercises);
            });
        });
    });
});

app.post('/api/workouts/:workoutId/exercises', (req, res) => {
    const { workoutId } = req.params;
    const { name, muscle_group } = req.body;
    db.run(
        'INSERT INTO exercises (workout_id, name, muscle_group) VALUES (?, ?, ?)',
        [workoutId, name, muscle_group],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.post('/api/exercises/:exerciseId/sets', (req, res) => {
    const { exerciseId } = req.params;
    const { reps, weight, rpe, notes } = req.body;
    db.run(
        'INSERT INTO sets (exercise_id, reps, weight, rpe, notes) VALUES (?, ?, ?, ?, ?)',
        [exerciseId, reps, weight, rpe, notes],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/exercises/:id', (req, res) => {
    db.run('DELETE FROM exercises WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

app.delete('/api/sets/:id', (req, res) => {
    db.run('DELETE FROM sets WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

app.delete('/api/workouts/:id', (req, res) => {
    db.run('DELETE FROM workouts WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// ========== HABITS ==========
app.post('/api/habits', (req, res) => {
    const { user_id, name, type, target_days, color } = req.body;
    db.run(
        'INSERT INTO habits (user_id, name, type, target_days, color) VALUES (?, ?, ?, ?, ?)',
        [user_id, name, type || 'build', target_days || 30, color || '#4a9eff'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/habits/:userId', (req, res) => {
    db.all('SELECT * FROM habits WHERE user_id = ?', [req.params.userId], (err, habits) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let pending = habits.length;
        if (pending === 0) return res.json([]);
        
        habits.forEach(habit => {
            db.all('SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date DESC', [habit.id], (err, logs) => {
                habit.logs = logs || [];
                habit.streak = calculateHabitStreak(logs || []);
                habit.completion_rate = calculateCompletionRate(logs || [], habit.target_days);
                if (--pending === 0) res.json(habits);
            });
        });
    });
});

function calculateHabitStreak(logs) {
    if (!logs.length) return 0;
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const sorted = logs.filter(l => l.status === 'done').sort((a, b) => b.date.localeCompare(a.date));
    
    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        if (sorted.find(l => l.date === checkDate)) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }
    return streak;
}

function calculateCompletionRate(logs, targetDays) {
    const recentLogs = logs.filter(l => {
        const logDate = new Date(l.date);
        const cutoff = new Date(Date.now() - targetDays * 86400000);
        return logDate >= cutoff;
    });
    const done = recentLogs.filter(l => l.status === 'done').length;
    return Math.round((done / targetDays) * 100);
}

app.post('/api/habits/:habitId/log', (req, res) => {
    const { habitId } = req.params;
    const { date, status, notes } = req.body;
    db.run(
        'INSERT OR REPLACE INTO habit_logs (habit_id, date, status, notes) VALUES (?, ?, ?, ?)',
        [habitId, date || new Date().toISOString().split('T')[0], status || 'done', notes],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/api/habits/:id', (req, res) => {
    db.run('DELETE FROM habits WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// ========== JOURNAL ==========
app.post('/api/journal', (req, res) => {
    const { user_id, date, sleep_hours, sleep_quality, energy_level, mood, stress_level, activities, notes } = req.body;
    db.run(
        `INSERT OR REPLACE INTO journal 
        (user_id, date, sleep_hours, sleep_quality, energy_level, mood, stress_level, activities, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, date || new Date().toISOString().split('T')[0], sleep_hours, sleep_quality, energy_level, mood, stress_level, activities, notes],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/journal/:userId', (req, res) => {
    db.all('SELECT * FROM journal WHERE user_id = ? ORDER BY date DESC', [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/journal/:userId/range', (req, res) => {
    const { userId } = req.params;
    const { start, end } = req.query;
    db.all(
        'SELECT * FROM journal WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
        [userId, start, end],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows || []);
        }
    );
});

// ========== HEALTH DATA ==========
app.post('/api/health', (req, res) => {
    const { user_id, date, steps, calories_burned, active_minutes, heart_rate_avg, heart_rate_max, distance, source } = req.body;
    db.run(
        `INSERT OR REPLACE INTO health_data 
        (user_id, date, steps, calories_burned, active_minutes, heart_rate_avg, heart_rate_max, distance, source) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, date || new Date().toISOString().split('T')[0], steps, calories_burned, active_minutes, heart_rate_avg, heart_rate_max, distance, source || 'manual'],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.get('/api/health/:userId', (req, res) => {
    db.all('SELECT * FROM health_data WHERE user_id = ? ORDER BY date DESC LIMIT 30', [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// ========== WELLNESS & INSIGHTS ==========
app.post('/api/wellness', (req, res) => {
    const { user_id, score, context, date } = req.body;
    db.run(
        'INSERT INTO wellness (user_id, score, context, date) VALUES (?, ?, ?, ?)',
        [user_id, score, context, date || new Date().toISOString().split('T')[0]],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.post('/api/insights', (req, res) => {
    const { user_id, text, date } = req.body;
    db.run(
        'INSERT INTO insights (user_id, text, date) VALUES (?, ?, ?)',
        [user_id, text, date || new Date().toISOString().split('T')[0]],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

app.post('/api/focus', (req, res) => {
    const { user_id, text, date } = req.body;
    db.run(
        'INSERT INTO focus (user_id, text, date) VALUES (?, ?, ?)',
        [user_id, text, date || new Date().toISOString().split('T')[0]],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// ========== ANALYTICS ==========
app.get('/api/analytics/:userId', (req, res) => {
    const { userId } = req.params;
    const { period = 'week' } = req.query;
    
    let days;
    switch (period) {
        case 'week': days = 7; break;
        case 'month': days = 30; break;
        case 'year': days = 365; break;
        default: days = 7;
    }
    
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const result = { period, days };

    // Tasks
    db.get(
        'SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM tasks WHERE user_id = ? AND date >= ?',
        [userId, cutoff],
        (err, tasks) => {
            result.tasks = tasks || { total: 0, completed: 0 };
            
            // Wellness avg
            db.get(
                'SELECT AVG(score) as avg_score FROM wellness WHERE user_id = ? AND date >= ?',
                [userId, cutoff],
                (err, wellness) => {
                    result.wellness = { avg_score: wellness?.avg_score ? parseFloat(wellness.avg_score).toFixed(1) : 0 };
                    
                    // Workouts count
                    db.get(
                        'SELECT COUNT(*) as count FROM workouts WHERE user_id = ? AND date >= ?',
                        [userId, cutoff],
                        (err, workouts) => {
                            result.workouts = workouts || { count: 0 };
                            
                            // Journal entries
                            db.all(
                                'SELECT * FROM journal WHERE user_id = ? AND date >= ? ORDER BY date',
                                [userId, cutoff],
                                (err, journal) => {
                                    result.journal = journal || [];
                                    
                                    // Health data
                                    db.all(
                                        'SELECT * FROM health_data WHERE user_id = ? AND date >= ? ORDER BY date',
                                        [userId, cutoff],
                                        (err, health) => {
                                            result.health = health || [];
                                            
                                            // Calculate correlations
                                            result.correlations = calculateCorrelations(journal || [], health || [], tasks || {});
                                            
                                            res.json(result);
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

function calculateCorrelations(journal, health, tasks) {
    const correlations = [];
    
    if (journal.length >= 3) {
        // Sleep vs Mood
        const sleepMood = journal.filter(j => j.sleep_hours && j.mood);
        if (sleepMood.length >= 3) {
            const avgSleepGoodMood = sleepMood
                .filter(j => j.mood >= 7)
                .reduce((sum, j) => sum + j.sleep_hours, 0) / sleepMood.filter(j => j.mood >= 7).length || 0;
            const avgSleepBadMood = sleepMood
                .filter(j => j.mood < 5)
                .reduce((sum, j) => sum + j.sleep_hours, 0) / sleepMood.filter(j => j.mood < 5).length || 0;
            
            if (avgSleepGoodMood > avgSleepBadMood) {
                correlations.push({
                    type: 'sleep_mood',
                    finding: `При хорошем настроении ты спишь в среднем ${avgSleepGoodMood.toFixed(1)}ч, при плохом — ${avgSleepBadMood.toFixed(1)}ч`,
                    recommendation: 'Больше сна = лучше настроение. Попробуй ложиться раньше.'
                });
            }
        }
        
        // Sleep vs Energy
        const sleepEnergy = journal.filter(j => j.sleep_hours && j.energy_level);
        if (sleepEnergy.length >= 3) {
            const avgSleepHighEnergy = sleepEnergy
                .filter(j => j.energy_level >= 7)
                .reduce((sum, j) => sum + j.sleep_hours, 0) / sleepEnergy.filter(j => j.energy_level >= 7).length || 0;
            
            correlations.push({
                type: 'sleep_energy',
                finding: `При энергии 7+ ты спал в среднем ${avgSleepHighEnergy.toFixed(1)}ч`,
                recommendation: avgSleepHighEnergy < 7 ? 'Попробуй добавить 30-60 минут сна' : 'Твой режим сна работает хорошо'
            });
        }
    }
    
    return correlations;
}

// ========== WEEKLY SUMMARY ==========
app.get('/api/summary/:userId/weekly', (req, res) => {
    const { userId } = req.params;
    const weekStart = new Date(Date.now() - (new Date().getDay() || 7) * 86400000).toISOString().split('T')[0];
    
    db.get('SELECT * FROM weekly_summaries WHERE user_id = ? AND week_start = ?', [userId, weekStart], (err, existing) => {
        if (existing) return res.json(existing);
        
        // Generate new summary
        generateWeeklySummary(userId, weekStart, (summary) => {
            res.json(summary);
        });
    });
});

function generateWeeklySummary(userId, weekStart, callback) {
    const weekEnd = new Date(new Date(weekStart).getTime() + 7 * 86400000).toISOString().split('T')[0];
    
    const summary = {
        week_start: weekStart,
        week_end: weekEnd,
        overview: {},
        correlations: [],
        recommendations: []
    };
    
    // Get all data for the week
    db.all('SELECT * FROM tasks WHERE user_id = ? AND date BETWEEN ? AND ?', [userId, weekStart, weekEnd], (err, tasks) => {
        summary.overview.tasks_completed = (tasks || []).filter(t => t.status === 'completed').length;
        summary.overview.tasks_total = (tasks || []).length;
        
        db.all('SELECT * FROM workouts WHERE user_id = ? AND date BETWEEN ? AND ?', [userId, weekStart, weekEnd], (err, workouts) => {
            summary.overview.workouts = (workouts || []).length;
            
            db.all('SELECT * FROM journal WHERE user_id = ? AND date BETWEEN ? AND ?', [userId, weekStart, weekEnd], (err, journal) => {
                const avgSleep = journal?.length 
                    ? (journal.reduce((sum, j) => sum + (j.sleep_hours || 0), 0) / journal.length).toFixed(1)
                    : 0;
                const avgMood = journal?.length
                    ? (journal.reduce((sum, j) => sum + (j.mood || 0), 0) / journal.length).toFixed(1)
                    : 0;
                
                summary.overview.avg_sleep = avgSleep;
                summary.overview.avg_mood = avgMood;
                summary.overview.journal_entries = (journal || []).length;
                
                // Simple recommendations
                summary.recommendations = [];
                if (avgSleep < 7) summary.recommendations.push('💤 Ты недосыпаешь. Попробуй лечь на час раньше.');
                if (summary.overview.workouts < 2) summary.recommendations.push('💪 Мало тренировок на этой неделе. Добавь хотя бы одну.');
                if (summary.overview.tasks_completed / summary.overview.tasks_total < 0.5) {
                    summary.recommendations.push('📋 Выполнено меньше половины задач. Попробуй сократить список или разбить задачи помельче.');
                }
                
                summary.correlations = calculateCorrelations(journal || [], [], summary.overview);
                
                // Save to DB
                db.run(
                    'INSERT INTO weekly_summaries (user_id, week_start, summary, correlations, recommendations) VALUES (?, ?, ?, ?, ?)',
                    [userId, weekStart, JSON.stringify(summary.overview), JSON.stringify(summary.correlations), JSON.stringify(summary.recommendations)]
                );
                
                callback(summary);
            });
        });
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Pumba Tracker Server v2.0 running on port ${PORT}`);
    bot.getMe().then(me => console.log(`🤖 Bot: @${me.username}`));
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    db.close();
    process.exit(0);
});
