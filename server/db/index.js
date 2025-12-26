import { Pool } from 'pg'
 
const pool = new Pool({
    user: 'postgres',
    password: 'password',
    host: 'localhost',
    port: 5432,
    database: 'practice',
})
 
export const query = async (text, params) => {
    try {
        const res = await pool.query(text, params)
        return res
    } catch (err) {
        console.error('Database query error:', err)
        throw err
    }
}