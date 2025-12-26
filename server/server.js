require("dotenv").config()
const express = require("express");
const morgan = require("morgan");
const db = require("./db")

const app = express();

// middleware
// middlewares have to be on top
// otherwise it will just hit the corresponding router handler and return
// app.use((req, res, next) => { 
//     console.log("test middleware")
//     // next function passes the req to the next middleware / route handler
//     next();
// });

// app.use(morgan("tiny"));

app.use(express.json());

// get all users
app.get("/api/v1/users", async (req, res) => {
    try {
        const results = await db.query(
            "SELECT * FROM users"
        );
        console.log(results);

        res.status(676).json({
            status: "success",
            results: results.rows.length,
            data: {
                users: results.rows
            },
        });
    } catch (err) {
        console.log(err);
    }
})

// get one user
app.get("/api/v1/users/:id", async (req, res) => {
    const { id } = req.params
    
    try {
        const results = await db.query(
            `SELECT * FROM users WHERE id = $1`, 
            [id]
        );
        console.log(results);

        res.status(676).json({
            status: "success",
            results: results.rows.length,
            data: {
                users: results.rows
            },
        });
    } catch (err) {
        console.log(err);
    }
});

// create a user
app.post("/api/v1/users", async (req, res) => {
    console.log(req.body)
    
    const { name, age, bio } = req.body;
    
    try {
        const results = await db.query(
            "INSERT INTO users (name, age, bio) values ($1, $2, $3) RETURNING *", 
            [name, age, bio]
        );
        console.log(results);

        res.status(201).json({
            status: "successfully added user",
            results: results.rows.length,
            data: {
                users: results.rows
            },
        });
    } catch (err) {
        console.log(err);
    }
});

// update a user
app.put("/api/v1/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, age, bio } = req.body;

    try {
        const results = await db.query(
            "UPDATE users SET name = $1, age = $2, bio = $3 WHERE id = $4 RETURNING *",
            [name, age, bio, id]
        );

        res.status(200).json({
            status: "success",
            data: {
                user: results.rows[0],
            },
        });
    } catch (err) {
        console.error(err);
    }
});

// DELETE a user
app.delete("/api/v1/users/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const results = await db.query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);

        if (results.rows.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "User not found",
            });
        }

        res.status(200).json({
            status: "success",
            message: "User successfully deleted",
            data: {
                user: results.rows[0],
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});

// if PORT env var defined use that, else use 33333
const port = process.env.PORT || 3005

console.log("test");

app.listen(port, () => {
    console.log(`server is up and listening on port ${port}`);
});