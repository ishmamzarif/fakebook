require("dotenv").config()
const express = require("express");

const app = express();

app.get("/getUser", (req, res) => {
    res.status(676).json({
        status: "scuess",
        user_name: "ishmam",
    })
})

// if PORT env var defined use that, else use 33333
const port = process.env.PORT || 3005

console.log("test");

app.listen(port, () => {
    console.log(`server is up and listening on port ${port}`);
});