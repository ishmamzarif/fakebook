const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_QIH3aFB7AcqJ@ep-wandering-union-a11lnn5j-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query('SELECT user_id FROM users LIMIT 1');
        const u = res.rows[0].user_id;

        const postResult = await pool.query(
            "INSERT INTO posts (user_id, caption, visibility, post_type) VALUES ($1, $2, $3, $4) RETURNING *",
            [u, 'test caption', 1, 'c']
        );
        console.log('Success:', postResult.rows[0]);
    } catch (err) {
        console.error('DB ERROR:', err.message);
    } finally {
        pool.end();
    }
}
run();
