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

    const results = await db.query("SELECT * FROM users");
    
    console.log(results)

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

    res.status(677).json({
        status: "success",
        data: {
            user: ["ishmam"]
        },
    });
});

// create a user
app.post("/api/v1/users", (req, res) => {
    console.log(req.body);
    
    res.status(678).json({
        status: "success",
        data: {
            user: ["mehwish"]
        },
    });
});

// update a user
app.put("/api/v1/users/:id", (req, res) => {
    console.log(req.params.id);
    console.log(req.body);

    res.status(679).json({
        status: "successfully updated"
    });
});

// delete a user
app.delete("/api/v1/users/:id", (req, res) => {
    res.status(680).json({
        status: "successfully deleted"
    });
})

// if PORT env var defined use that, else use 33333
const port = process.env.PORT || 3005

console.log("test");

app.listen(port, () => {
    console.log(`server is up and listening on port ${port}`);
});