const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool (supports Supabase connection string via DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:5432/${process.env.DB_NAME || 'cmms_db'}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test DB connection on startup
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL (Supabase) Connected!');
        client.release();
    })
    .catch(err => console.error('❌ PostgreSQL Connection Failed:', err.message));

module.exports = pool;
