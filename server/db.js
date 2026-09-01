const fs = require('fs');
const path = require('path');

let db;

// Check if Railway provides PostgreSQL
if (process.env.DATABASE_URL) {
  // PostgreSQL mode (Railway)
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('🐘 Using PostgreSQL (Railway)');
} else {
  // SQLite mode (local)
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'pumba.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  db = new sqlite3.Database(dbPath);
  console.log('📁 Using SQLite:', dbPath);
}

module.exports = db;
