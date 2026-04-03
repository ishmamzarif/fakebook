require('dotenv').config();
const pool = require('./db/db');
const query = process.argv[2];
if (!query) {
    console.error("Please provide a query as an argument.");
    process.exit(1);
}
pool.query(query)
  .then(res => { console.table(res.rows); process.exit(); })
  .catch(err => { console.error(err); process.exit(1); });
