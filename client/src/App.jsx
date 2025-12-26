import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Home from "./routes/Home";
import UserProfile from "./routes/UserProfile";
import UpdateProfile from "./routes/UpdateProfile";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users/:id/update" element={<UpdateProfile />} />
        <Route path="/users/:id" element={<UserProfile />} />
      </Routes>
    </Router>
  );
};

export default App;
