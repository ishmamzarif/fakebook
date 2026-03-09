import React from "react";
import StoriesSection from "../components/StoriesSection";
import PostCreation from "../components/PostCreation";
import Feed from "../components/Feed";
import "../styles/Home.css";

const Home = () => {
  return (
    <div className="home-page">
      <main className="home-main">
        <StoriesSection />
        <PostCreation />
        <Feed />
      </main>
    </div>
  );
};

export default Home;
