require("dotenv").config();
const express = require("express");

const authRoutes = require("./routes/auth");
const getUserById = require("./routes/getUserById");
const getAllUsers = require("./routes/getAllUsers");
const updateUser = require("./routes/updateUser");
const getFriendStatus = require("./routes/getFriendStatus");
const getFeed = require("./routes/getFeed");

const app = express();
app.use(express.json());

app.use("/api/v1/auth", authRoutes);

app.get("/api/v1/users/:id", getUserById);
app.get("/api/v1/users", getAllUsers);
app.put("/api/v1/users/:id", updateUser);

app.get("/api/v1/friends/status/:profileUserId", getFriendStatus);
app.get("/api/v1/feed", getFeed);

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
