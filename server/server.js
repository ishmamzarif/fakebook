require("dotenv").config();
const express = require("express");
const pool = require("./db/db.js");
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.post("/api/v1/auth/login", async (req, res) => {
    const { username_or_email, password } = req.body;
    if (!username_or_email || !password) {
        return res.status(400).json({ status: "fail", message: "Username/email and password are required" });
    }
    try {
        const result = await pool.query(
            `select user_id, username, email, full_name, profile_picture from users 
             where (username = $1 or email = $1) and password = $2`,
            [username_or_email.trim(), password]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ status: "fail", message: "Invalid username/email or password" });
        }
        res.status(200).json({
            status: "success",
            data: result.rows[0],
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/api/v1/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `select user_id, username, email, full_name, nickname, profile_link, avatar_url, profile_picture, cover_picture, bio, phone_number, curr_institution, address, is_private, num_friends, created_at from users where user_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: "fail", message: "User not found" });
        }

        res.status(200).json({
            status: "success",
            data: result.rows[0],
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
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
