require('dotenv').config({path: './.env'});
const pool = require('./db/db');
pool.query("SELECT * FROM notifications WHERE type = 'friend_request' OR type = 'now_friends' ORDER BY created_at DESC LIMIT 5").then(r => console.log(r.rows)).catch(console.error).finally(() => pool.end());
