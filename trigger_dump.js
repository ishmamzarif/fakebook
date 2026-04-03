require('dotenv').config({path: './server/.env'});
const pool = require('./server/db/db');
pool.query("SELECT tgname, pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid = 'friend_requests'::regclass;")
  .then(r => console.log(r.rows))
  .catch(console.error)
  .finally(() => pool.end());
