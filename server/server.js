require("dotenv").config();
const express = require("express");

const authRoutes = require("./routes/auth");
const getUserById = require("./routes/getUserById");
const getAllUsers = require("./routes/getAllUsers");
const updateUser = require("./routes/updateUser");
const getFriendStatus = require("./routes/getFriendStatus");
const getFeed = require("./routes/getFeed");
const acceptFriendRequest = require("./routes/acceptFriendRequest");
const unfriendUser = require("./routes/unfriendUser");
const sendFriendRequest = require("./routes/sendFriendRequest");
const createPost = require("./routes/createPost");
const getUserPosts = require("./routes/getUserPosts");
const getMessages = require("./routes/getMessages");
const sendMessage = require("./routes/sendMessage");
const unsendMessage = require("./routes/unsendMessage");
const reactMessage = require("./routes/reactMessage");
const auth = require("./middlewares/auth");

const app = express();
app.use(express.json());
const cancelFriendRequest = require("./routes/cancelFriendRequest");

app.post("/api/v1/friends/cancel", cancelFriendRequest);

app.use("/api/v1/auth", authRoutes);
app.post("/api/v1/friends/request", sendFriendRequest);
app.post("/api/v1/friends/unfriend", unfriendUser);
app.get("/api/v1/users/:id", getUserById);
app.get("/api/v1/users", getAllUsers);
app.put("/api/v1/users/:id", updateUser);

app.post("/api/v1/posts", createPost);
app.get("/api/v1/posts/user/:id", getUserPosts);

app.get("/api/v1/friends/status/:profileUserId", getFriendStatus);
app.get("/api/v1/feed", getFeed);
app.post("/api/v1/friends/accept", acceptFriendRequest);
app.get("/api/v1/messages/:userId", auth, getMessages);
app.post("/api/v1/messages", auth, sendMessage);
app.delete("/api/v1/messages/:messageId", auth, unsendMessage);
app.post("/api/v1/messages/:messageId/react", auth, reactMessage);



app.listen(3001, () => {
  console.log("Server running on port 3001");
});
