require("dotenv").config(); 
const express = require("express"); 
const pool = require("D:\\2-1\\fakebook\\fakebook\\server\\db\\db.js"); 
const app = express(); 

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/api/v1/users", async(req, res) => {
    try {
        const result = await pool.query('select user_id,username, email, full_name, bio, profile_picture, created_at from users');
        res.status(200).json({
            status : 'successs',
            results : result.rows.length,
            data : result.rows,
        });
    }catch(err) {
        console.error(err.message);
        res.status(500).json({error : 'Server error'});
    }
});

app.get("/api/v1/feed", async (req, res) => {
    try {
        const result = await pool.query(`
            select
                p.post_id,
                p.content,
                p.image,
                p.created_at,
                u.user_id,
                u.username,
                u.profile_picture,
                count(distinct l.user_id) like_count,
                count(distinct c.comment_id) comment_count
            from posts p
            join users u on p.user_id = u.user_id
            left join likes l on p.post_id = l.post_id
            left join comments c on p.post_id = c.post_id
            group by p.post_id, u.user_id
            order by p.created_at desc
        `);

        res.status(200).json({
            status: "successs",
            results: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "server erorr" });
    }
});
