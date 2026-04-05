import React, { useState } from "react";
import { useUser } from "../context/UserContext";
import StoriesSection from "../components/StoriesSection";
import PostCreation from "../components/PostCreation";
import Feed from "../components/Feed";

const Home = () => {
  const { currentUser } = useUser();
  const [feedReloadKey, setFeedReloadKey] = useState(0);

  const handlePostCreated = () => {
    setFeedReloadKey((prev) => prev + 1);
  };

  if (!currentUser) {
    return (
      <div className="home-page">
        <main className="home-main">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Please login to see the home page</h2>
          </div>
        </main>
      </div>
    );
  }

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
