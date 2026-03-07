import React from "react";

const StoriesSection = () => {
  const stories = [
    { id: 1, username: "john_doe", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 2, username: "jane_smith", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 3, username: "mike_johnson", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 4, username: "sarah_connor", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 5, username: "alex_turner", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
  ];

  return (
    <section className="stories-section">
      <div className="stories-scroll">
        {stories.map((story) => (
          <div key={story.id} className="story-card">
            <div
              className="story-image"
              style={{ backgroundImage: `url(${story.storyImage})` }}
            >
              <div className="story-overlay"></div>
              <img src={story.profileImage} alt={story.username} className="story-avatar" />
              <div className="story-username">{story.username}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StoriesSection;
