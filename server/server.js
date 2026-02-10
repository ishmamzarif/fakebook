require("dotenv").config();
const express = require("express");
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const pool = require("./db/db.js");

const app = express();
const PORT = process.env.PORT || 3001;

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'fakebook_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif'],
    },
});

const upload = multer({ storage: storage });

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

app.post("/api/v1/auth/register", async (req, res) => {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password || !full_name) {
        return res.status(400).json({ status: "fail", message: "Please fill out all the fields" });
    }

    try {
        const userCheck = await pool.query(
            "SELECT username, email FROM users WHERE username = $1 OR email = $2",
            [username, email]
        );

        if (userCheck.rows.length > 0) {
            const existingUser = userCheck.rows[0];
            if (existingUser.username === username) {
                return res.status(409).json({ status: "fail", message: "This username already exists" });
            }
            if (existingUser.email === email) {
                return res.status(409).json({ status: "fail", message: "This email address is already in use" });
            }
        }

        const newUser = await pool.query(
            "INSERT INTO users (username, email, password, full_name) VALUES ($1, $2, $3, $4) RETURNING user_id, username, email, full_name, created_at",
            [username, email, password, full_name]
        );

        res.status(201).json({
            status: "success",
            data: newUser.rows[0],
        });
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            if (err.constraint === 'users_username_key') {
                return res.status(409).json({ status: "fail", message: "This username already exists" });
            }
            if (err.constraint === 'users_email_key') {
                return res.status(409).json({ status: "fail", message: "This email address is already in use" });
            }
        }
        res.status(500).json({ error: "Server error" });
    }
});

// Update User Route
app.put("/api/v1/users/:id", upload.fields([{ name: 'profile_picture', maxCount: 1 }, { name: 'cover_picture', maxCount: 1 }]), async (req, res) => {
    const { id } = req.params;
    const { full_name, phone_number, address, bio, curr_institution, is_private } = req.body;

    try {
        let updateFields = [];
        let values = [];
        let valueCounter = 1;

        if (full_name !== undefined) { updateFields.push(`full_name = $${valueCounter++}`); values.push(full_name); }
        if (phone_number !== undefined) { updateFields.push(`phone_number = $${valueCounter++}`); values.push(phone_number); }
        if (address !== undefined) { updateFields.push(`address = $${valueCounter++}`); values.push(address); }
        if (bio !== undefined) { updateFields.push(`bio = $${valueCounter++}`); values.push(bio); }
        if (curr_institution !== undefined) { updateFields.push(`curr_institution = $${valueCounter++}`); values.push(curr_institution); }
        if (is_private !== undefined) { updateFields.push(`is_private = $${valueCounter++}`); values.push(is_private === 'true' || is_private === true); }

        if (req.files['profile_picture']) {
            updateFields.push(`profile_picture = $${valueCounter++}`);
            values.push(req.files['profile_picture'][0].path);
        }

        if (req.files['cover_picture']) {
            updateFields.push(`cover_picture = $${valueCounter++}`);
            values.push(req.files['cover_picture'][0].path);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ status: "fail", message: "No fields to update" });
        }

        values.push(id);
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${valueCounter} RETURNING *`;

        const result = await pool.query(query, values);

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

app.get("/api/v1/users", async (req, res) => {
    try {
        const result = await pool.query('select user_id,username, email, full_name, bio, profile_picture, created_at from users');
        res.status(200).json({
            status: 'successs',
            results: result.rows.length,
            data: result.rows,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
