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

// Database setup
let db;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  // PostgreSQL (Railway)
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  isPostgres = true;
  console.log('🐘 PostgreSQL mode (Railway)');
} else {
  // SQLite (local)
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'data', 'pumba.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  db = new sqlite3.Database(dbPath);
  console.log('📁 SQLite mode:', dbPath);
}

// Database helpers
const dbRun = (sql, params = []) => {
  if (isPostgres) {
    return db.query(sql, params);
  }
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbAll = (sql, params = []) => {
  if (isPostgres) {
    return db.query(sql, params).then(result => result.rows);
  }
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  if (isPostgres) {
    return db.query(sql, params).then(result => result.rows[0]);
  }
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize database
async function initDatabase() {
  if (isPostgres) {
    // Read and execute PostgreSQL schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema-postgres.sql'), 'utf8');
    await db.query(schema);
    console.log('✅ PostgreSQL schema initialized');
  } else {
    // SQLite schema (existing code)
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (...)`);
      // ... (existing SQLite schema)
    });
  }
}

// Telegram Bot
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log('🤖 Bot started');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: isPostgres ? 'postgres' : 'sqlite' });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initDatabase();
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (isPostgres) await db.end();
  else db.close();
  process.exit(0);
});
