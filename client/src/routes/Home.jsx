import React, { useState } from "react";
import StoriesSection from "../components/StoriesSection";
import PostCreation from "../components/PostCreation";
import Feed from "../components/Feed";
import "../styles/Home.css";

const Home = () => {
  const [feedReloadKey, setFeedReloadKey] = useState(0);

  const handlePostCreated = () => {
    setFeedReloadKey((prev) => prev + 1);
  };

  return (
    <div className="home-page">
      <main className="home-main">
        <StoriesSection />
        <PostCreation onPostCreated={handlePostCreated} />
        <Feed reloadTrigger={feedReloadKey} />
      </main>
    </div>
  );
};

export default Home;
