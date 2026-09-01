-- PostgreSQL schema for Pumba Tracker
-- Run this after connecting to Railway PostgreSQL

-- Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    text TEXT NOT NULL,
    category TEXT DEFAULT 'Без категории',
    status TEXT DEFAULT 'backlog',
    priority INTEGER DEFAULT 1,
    due_date TEXT,
    date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    type TEXT,
    duration INTEGER,
    notes TEXT,
    date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    muscle_group TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sets
CREATE TABLE IF NOT EXISTS sets (
    id SERIAL PRIMARY KEY,
    exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
    reps INTEGER,
    weight REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'build',
    target_days INTEGER DEFAULT 21,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Habit Logs
CREATE TABLE IF NOT EXISTS habit_logs (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
    date TEXT,
    status INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal
CREATE TABLE IF NOT EXISTS journal (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date TEXT,
    sleep_hours REAL,
    sleep_quality INTEGER,
    energy INTEGER,
    mood INTEGER,
    stress INTEGER,
    notes TEXT,
    activities TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health Data
CREATE TABLE IF NOT EXISTS health_data (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date TEXT,
    steps INTEGER,
    calories INTEGER,
    heart_rate INTEGER,
    active_minutes INTEGER,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Focus Sessions
CREATE TABLE IF NOT EXISTS focus (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    task_id INTEGER,
    duration INTEGER,
    start_time TEXT,
    end_time TEXT,
    interruptions INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insights
CREATE TABLE IF NOT EXISTS insights (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    period TEXT,
    data JSONB,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Summaries
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    week_start TEXT,
    week_end TEXT,
    summary TEXT,
    highlights TEXT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voice Messages
CREATE TABLE IF NOT EXISTS voice_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    file_id TEXT,
    transcription TEXT,
    intent TEXT,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
