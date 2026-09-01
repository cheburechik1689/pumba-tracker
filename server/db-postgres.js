const { Pool } = require('pg');

// Railway provides DATABASE_URL automatically
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/pumba',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

console.log('🐘 PostgreSQL mode:', process.env.DATABASE_URL ? 'Railway' : 'Local');

module.exports = pool;
