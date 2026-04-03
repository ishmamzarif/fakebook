require('dotenv').config({path: './server/.env'});
const pool = require('./server/db/db');
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';")
  .then(r => console.log(r.rows))
  .catch(console.error)
  .finally(() => pool.end());
