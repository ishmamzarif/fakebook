import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./routes/Login";
import Home from "./routes/Home";
import UserProfile from "./routes/UserProfile";
import UpdateProfile from "./routes/UpdateProfile";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/users/:id" element={<UserProfile />} />
        <Route path="/users/:id/update" element={<UpdateProfile />} />
      </Routes>
    </Router>
  );
};

export default App;
