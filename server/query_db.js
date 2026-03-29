require('dotenv').config();
const pool = require('./db/db');
pool.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1', ['conversations'])
  .then(res => { console.table(res.rows); process.exit(); })
  .catch(err => { console.error(err); process.exit(1); });
