require("dotenv").config()
const express = require("express");

const app = express();

// get all users
app.get("/api/v1/users", (req, res) => {
    res.status(676).json({
        status: "success",
        data: {
            users: ["ishmam", "thuja"]
        },
    })
})

// get one user
app.get("/api/v1/users/:id", (req, res) => {
    console.log(req.params);
});

// create a user
app.post("/api/v1/users", (req, res) => {
    console.log(req)
});

// delete a user

// if PORT env var defined use that, else use 33333
const port = process.env.PORT || 3005

console.log("test");

app.listen(port, () => {
    console.log(`server is up and listening on port ${port}`);
});