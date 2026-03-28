import React from "react";
import { useUser } from "../context/UserContext";

const StoriesSection = () => {
  const { currentUser } = useUser();
  const stories = [
    { id: 1, username: " ", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 2, username: " ", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 3, username: " ", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 4, username: " ", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
    { id: 5, username: " ", profileImage: "https://via.placeholder.com/80", storyImage: "https://via.placeholder.com/400x600" },
  ];

  return (
    <section className="stories-section">
      <div className="stories-scroll">
        {/* Create Story Card */}
        <div className="story-card create-story-card">
          <div
            className="story-image create-story-image"
            style={currentUser?.profile_picture ? { backgroundImage: `url(${currentUser.profile_picture})` } : { backgroundColor: "var(--color-bg-dark)" }}
          >
            <div className="story-overlay"></div>
            <div className="create-story-btn-wrapper">
              <div className="create-story-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="story-username">Create Story</div>
          </div>
        </div>

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
