import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import Layout from "./components/Layout";
import Login from "./routes/Login";
import Signup from "./routes/Signup";
import Home from "./routes/Home";
import UserProfile from "./routes/UserProfile";
import UpdateProfile from "./routes/UpdateProfile";
import Messages from "./routes/Messages";
import Notifications from "./routes/Notifications";
import Friends from "./routes/Friends";
import PostDetail from "./routes/PostDetail";
import EditPost from "./routes/EditPost";

const App = () => {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<Layout />}>
            <Route path="home" element={<Home />} />
            <Route path="users/:id" element={<UserProfile />} />
            <Route path="users/:id/update" element={<UpdateProfile />} />
            <Route path="messages/:id" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="friends" element={<Friends />} />
            <Route path="posts/:id" element={<PostDetail />} />
            <Route path="posts/:id/edit" element={<EditPost />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
};

export default App;
