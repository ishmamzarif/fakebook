require('dotenv').config();
const pool = require('./db/db');

async function addLastSeen() {
    try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW()');
        console.log('Successfully added last_seen column to users table');
    } catch (err) {
        console.error('Error adding last_seen column:', err);
    } finally {
        process.exit();
    }
}

addLastSeen();
