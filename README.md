# fakebook

BUET CSE 2-1 DBMS project using the **PERN stack** (PostgreSQL, Express, React, Node.js).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [API Overview](#api-overview)
  - [Authentication](#authentication)
  - [Users](#users)
  - [Posts & Feed](#posts--feed)
  - [Reactions](#reactions)
  - [Comments](#comments)
  - [Stories](#stories)
  - [Friends](#friends)
  - [Direct Messages](#direct-messages)
  - [Group Chats](#group-chats)
  - [Notifications](#notifications)
  - [AI Content Moderation](#ai-content-moderation)
- [Database Logic](#database-logic)
  - [Stored Procedures](#stored-procedures)
  - [Functions](#functions)
  - [Triggers](#triggers)

---

## Features

- **Authentication** — JWT-based login and registration with bcrypt password hashing
- **Posts** — create, edit, delete posts with images/videos (up to 10 files), captions, and tagged users
- **Feed** — personalized feed showing posts from you and your friends
- **Emoji Reactions** — 7-emoji reaction system on posts, comments, and messages (polymorphic design)
- **Comments & Replies** — two-level comment threads with media attachments
- **Stories** — 24-hour expiring media stories with view tracking and viewer lists
- **Friends** — full friend request lifecycle (send, accept, reject, cancel, unfriend) with a social graph
- **Direct Messages** — 1-on-1 DMs with media, emoji reactions, and read receipts
- **Group Chats** — group conversations with admin controls, member management, and shared messages
- **Notifications** — automated notifications for all interactions (likes, comments, messages, friend requests, tags, new posts)
- **AI Moderation** — dual-layer content moderation using Google Gemini (text) and TensorFlow MobileNet (images)
- **Privacy Controls** — private profiles, `hide_inappropriate` content filter per user

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (JSX), CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Media storage | Cloudinary |
| Text moderation | Google Gemini 2.5 Flash |
| Image moderation | TensorFlow MobileNet (local) |
| Validation | express-validator, libphonenumber-js |

---

## API Overview

All routes are prefixed with `/api/v1`. Routes marked 🔒 require a `Bearer` JWT token in the `Authorization` header.

---

### Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with username or email + password. Returns user object and 7-day JWT. |
| `POST` | `/auth/register` | Register with validated email, username (3–20 chars), password (≥8 chars), and phone number. |

**Login query**
```sql
SELECT user_id, username, email, full_name, profile_picture, password, is_private, hide_inappropriate
FROM users
WHERE username = $1 OR email = $1
```

**Register — check for duplicates, then insert**
```sql
SELECT 1 FROM users WHERE username = $1 OR email = $2

INSERT INTO users (username, email, password, full_name, phone_number)
VALUES ($1, $2, $3, $4, $5)
RETURNING user_id, username, email, full_name, phone_number, is_private, hide_inappropriate
```

---

### Users

| Method | Route | Description |
|---|---|---|
| `GET` | `/users/:id` | Get full profile by user ID. |
| `GET` | `/users?q=&limit=` | Search users by username, full name, or nickname. Max 20 results when searching, 50 otherwise. |
| `PUT` 🔒 | `/users/:id` | Update profile fields and/or upload profile/cover photo (Cloudinary). Dynamic field builder — only provided fields are updated. |
| `DELETE` 🔒 | `/users/:id` | Delete own account — calls the `delete_user_account` stored procedure. |

**User search**
```sql
SELECT user_id, username, email, full_name, bio, profile_picture
FROM users
WHERE username ILIKE $1 OR full_name ILIKE $1 OR nickname ILIKE $1
ORDER BY username ASC
LIMIT $2
```

---

### Posts & Feed

| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/posts` | Create a post. Supports caption, up to 10 media files, visibility level, and tagged user IDs. Runs AI moderation before inserting. |
| `PUT` 🔒 | `/posts/:id` | Edit caption, delete specific media IDs, or append new files. Re-runs moderation on new content. |
| `DELETE` 🔒 | `/posts/:id` | Delete a post (ownership verified). ON DELETE CASCADE handles media, comments, likes. |
| `GET` 🔒 | `/posts/:id` | Get a single post with likes, comments count, media, tags, and current user's reaction. |
| `GET` 🔒 | `/posts/user/:id` | Get all posts by a user. Respects `is_private` — only friends can view private profiles. |
| `GET` 🔒 | `/feed` | Get the current user's personalized feed. |

**Feed — the most complex query in the project**
```sql
SELECT
  p.post_id, p.caption, p.post_type, p.flagged, p.created_at,
  u.username, u.full_name, u.profile_picture,
  COUNT(DISTINCT CASE WHEN l.target_type LIKE 'post_reaction:%' THEN l.like_id END)::int AS likes_count,
  COUNT(DISTINCT c.comment_id)::int AS comments_count,
  (
    SELECT SUBSTRING(target_type FROM 15) FROM likes
    WHERE user_id = $1 AND target_id = p.post_id AND target_type LIKE 'post_reaction:%'
    LIMIT 1
  ) AS user_reaction,
  COALESCE(JSON_AGG(
    JSON_BUILD_OBJECT('media_id', cm.media_id, 'media_url', cm.media_url,
                      'media_type', cm.media_type, 'media_order', cm.media_order)
  ) FILTER (WHERE cm.media_id IS NOT NULL), '[]'::json) AS media,
  (
    SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
      'user_id', ut.user_id, 'username', ut.username, 'full_name', ut.full_name
    )), '[]'::json)
    FROM post_tags pt JOIN users ut ON pt.tagged_user_id = ut.user_id
    WHERE pt.post_id = p.post_id
  ) AS tags
FROM posts p
JOIN users u ON p.user_id = u.user_id
CROSS JOIN users v                          -- viewer row for hide_inappropriate
LEFT JOIN likes l        ON l.target_id = p.post_id
LEFT JOIN comments c     ON c.post_id = p.post_id
LEFT JOIN content_media cm ON cm.type = 'post' AND cm.reference_id = p.post_id
WHERE v.user_id = $1
  AND (
    p.user_id = $1
    OR p.user_id IN (
      SELECT friend1_id FROM friends WHERE friend2_id = $1
      UNION
      SELECT friend2_id FROM friends WHERE friend1_id = $1
    )
  )
  AND (p.flagged = FALSE OR v.hide_inappropriate = FALSE OR p.user_id = $1)
GROUP BY p.post_id, u.user_id, v.user_id
ORDER BY p.created_at DESC
```

**`getUserPosts` adds a privacy guard via the inline function**
```sql
AND (
  u.is_private = FALSE
  OR u.user_id = v.user_id
  OR get_friend_status(u.user_id, v.user_id) = 'FRIENDS'
)
```

---

### Reactions

| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/posts/:postId/react` | Toggle or change an emoji reaction on a post. Allowed: 👍 ❤️ 😂 🥰 😮 😢 😡 |
| `GET` 🔒 | `/posts/:id/reactions` | Get all reactors on a post with their emoji. |
| `POST` 🔒 | `/messages/:messageId/react` | Toggle an emoji reaction on a message. |

All reactions are stored in the polymorphic `likes` table using `target_type` (e.g. `post_reaction:👍`, `message_reaction:❤️`) and `target_id`.

**Reaction toggle logic — one of three branches**
```sql
-- Check for existing reaction
SELECT like_id, target_type FROM likes
WHERE user_id = $1 AND target_id = $2 LIMIT 1

-- Same emoji → remove
DELETE FROM likes WHERE like_id = $1

-- Different emoji → switch
UPDATE likes SET target_type = $1 WHERE like_id = $2

-- No reaction yet → insert
INSERT INTO likes (user_id, target_type, target_id) VALUES ($1, $2, $3)
```

**Extract emoji from target_type**
```sql
SELECT SUBSTRING(target_type FROM 15) AS emoji  -- strips 'post_reaction:' prefix
FROM likes WHERE target_id = $1 AND target_type LIKE 'post_reaction:%'
```

---

### Comments

| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/posts/:postId/comment` | Create a comment. Text is moderated via Gemini before insert. |
| `GET` 🔒 | `/posts/:postId/comments` | Get up to 200 comments on a post. Respects `hide_inappropriate`. |
| `POST` 🔒 | `/comments/media/upload` | Upload comment media to Cloudinary. Returns URLs — no DB write. |

```sql
INSERT INTO comments (post_id, user_id, content, flagged, created_at)
VALUES ($1, $2, $3, $4, timezone('utc', now()))
RETURNING *

-- Fetch with viewer filter
SELECT c.comment_id, c.content, c.flagged, c.created_at
FROM comments c CROSS JOIN users v
WHERE c.post_id = $1 AND v.user_id = $2
  AND (c.flagged = FALSE OR v.hide_inappropriate = FALSE OR c.user_id = $2)
ORDER BY c.created_at ASC LIMIT 200
```

---

### Stories

| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/stories` | Upload a story. Image moderated via MobileNet. Expires after 24 hours. |
| `GET` 🔒 | `/stories` | Get all active stories from self + friends. Includes `viewed_by_me` and `view_count`. |
| `POST` 🔒 | `/stories/:storyId/view` | Record a view. Skips if viewer is the owner. Idempotent. |
| `GET` 🔒 | `/stories/:storyId/viewers` | Get viewer list with timestamps (owner only). |
| `DELETE` 🔒 | `/stories/:id` | Delete own story. |

**Create with 24h expiry**
```sql
INSERT INTO stories (user_id, media_type, media_url, flagged, created_at, expires_at)
VALUES ($1, $2, $3, $4, timezone('utc', now()), timezone('utc', now()) + interval '24 hours')
RETURNING *
```

**Get stories — double self-join on story_views**
```sql
SELECT
  s.story_id, s.media_url, s.expires_at,
  u.username, u.full_name, u.profile_picture,
  CASE WHEN sv.viewer_id IS NOT NULL THEN true ELSE false END AS viewed_by_me,
  COUNT(DISTINCT sv2.viewer_id)::int AS view_count
FROM stories s
JOIN users u ON s.user_id = u.user_id
CROSS JOIN users v
LEFT JOIN story_views sv  ON sv.story_id = s.story_id AND sv.viewer_id = $1  -- own view flag
LEFT JOIN story_views sv2 ON sv2.story_id = s.story_id                        -- all views count
WHERE v.user_id = $1
  AND s.expires_at > timezone('utc', now())
  AND (s.user_id = $1 OR s.user_id IN (
    SELECT friend1_id FROM friends WHERE friend2_id = $1 UNION
    SELECT friend2_id FROM friends WHERE friend1_id = $1
  ))
  AND (s.flagged = FALSE OR v.hide_inappropriate = FALSE OR s.user_id = $1)
GROUP BY s.story_id, u.user_id, sv.viewer_id, v.user_id
ORDER BY s.created_at DESC
```

---

### Friends

| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/friends/request` | Send a friend request. Clears any stale previous requests before inserting. |
| `POST` 🔒 | `/friends/accept` | Accept a request. Calls `accept_friend_request` stored procedure, then inserts a notification. |
| `POST` 🔒 | `/friends/reject` | Set request status to `rejected`. |
| `POST` 🔒 | `/friends/cancel` | Delete a pending outgoing request. |
| `POST` 🔒 | `/friends/unfriend` | Remove from `friends` table and clean up `friend_requests`. |
| `GET` 🔒 | `/friends/status/:profileUserId` | Returns `SELF`, `FRIENDS`, `SENT`, `RECEIVED`, or `NONE`. |
| `GET` 🔒 | `/friends` | Get the current user's full friend list with `last_seen` timestamps. |
| `GET` 🔒 | `/friends/requests` | Get all incoming pending friend requests. |

**Friends list — CASE in JOIN to handle normalized ordering**
```sql
SELECT u.user_id, u.username, u.full_name, u.profile_picture, u.last_seen,
       MAX(f.created_at) AS friended_at
FROM friends f
JOIN users u ON u.user_id = CASE
  WHEN f.friend1_id = $1 THEN f.friend2_id
  ELSE f.friend1_id
END
WHERE f.friend1_id = $1 OR f.friend2_id = $1
GROUP BY u.user_id, u.username, u.full_name, u.nickname, u.profile_picture, u.last_seen
ORDER BY friended_at DESC
```

**Accept — idempotent notification insert**
```sql
INSERT INTO notifications (user_id, actor_id, type, reference_id)
SELECT $1, $2, 'friend_request_accepted', fr.request_id
FROM friend_requests fr
WHERE fr.sender_id = $2 AND fr.receiver_id = $1 AND fr.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.user_id = $1 AND n.actor_id = $2
      AND n.type = 'friend_request_accepted' AND n.reference_id = fr.request_id
  )
LIMIT 1
```

---

### Direct Messages

| Method | Route | Description |
|---|---|---|
| `GET` 🔒 | `/messages/:userId` | Fetch the DM conversation with another user. Returns up to 200 messages with media and reactions. |
| `POST` 🔒 | `/messages` | Send a DM. Creates the conversation if it doesn't exist yet. Supports media attachments. |
| `DELETE` 🔒 | `/messages/:messageId` | Unsend a message (sender only). Deletes media first, then the message row. |
| `POST` 🔒 | `/messages/:messageId/react` | React to a message with an emoji. |
| `GET` 🔒 | `/conversations` | List all DM and group conversations with unread counts and last message previews. |
| `POST` 🔒 | `/conversations/:conversationId/read` | Mark a conversation as read (updates `last_read_at`). |

**Find the exact DM between two users**
```sql
SELECT c.conversation_id
FROM conversations c
JOIN conversation_members cm ON cm.conversation_id = c.conversation_id
WHERE c.is_group = false
GROUP BY c.conversation_id
HAVING COUNT(*) = 2
  AND BOOL_OR(cm.user_id = $1)
  AND BOOL_OR(cm.user_id = $2)
LIMIT 1
```

**Conversations list — LATERAL joins for efficiency**
```sql
SELECT
  c.conversation_id, c.is_group, c.group_name, c.group_photo_url,
  u.user_id AS other_user_id, u.username, u.full_name, u.profile_picture,
  m.content AS message_text, m.created_at,
  (
    SELECT COUNT(*)::int FROM messages m3
    WHERE m3.conversation_id = c.conversation_id
      AND m3.created_at > cm.last_read_at
      AND m3.sender_id != $1
  ) AS unread_count
FROM conversations c
JOIN conversation_members cm ON c.conversation_id = cm.conversation_id
LEFT JOIN LATERAL (
  SELECT u.user_id, u.username, u.full_name, u.profile_picture
  FROM conversation_members cm2 JOIN users u ON cm2.user_id = u.user_id
  WHERE cm2.conversation_id = c.conversation_id AND cm2.user_id != $1
  LIMIT 1
) u ON true
LEFT JOIN LATERAL (
  SELECT content, created_at FROM messages
  WHERE conversation_id = c.conversation_id
  ORDER BY created_at DESC LIMIT 1
) m ON true
WHERE cm.user_id = $1
ORDER BY m.created_at DESC NULLS LAST
```

---

### Group Chats

| Method | Route | Description |
|---|---|---|
| `POST` 🔒 | `/groups` | Create a group chat with name, optional photo, and initial members. Creator becomes admin. |
| `GET` 🔒 | `/groups/:conversationId/messages` | Fetch group messages with sender info, media, and reactions. |
| `POST` 🔒 | `/groups/:conversationId/messages` | Send a message to a group. |
| `PUT` 🔒 | `/groups/:conversationId` | Update group name or photo (admin only). |
| `GET` 🔒 | `/groups/:conversationId/members` | Get member list. |
| `POST` 🔒 | `/groups/:conversationId/members` | Add one or multiple members (admin only). |
| `DELETE` 🔒 | `/groups/:conversationId/members/:userId` | Remove a member (admin only, cannot remove self). |

---

### Notifications

| Method | Route | Description |
|---|---|---|
| `GET` 🔒 | `/notifications` | Get all notifications. Resolves `post_id` and `conversation_id` per notification type via CASE subqueries. |
| `GET` 🔒 | `/notifications/unread-count` | Get count of unseen notifications. |
| `PUT` 🔒 | `/notifications/read` | Mark all notifications as read. |
| `PUT` 🔒 | `/notifications/seen` | Mark notifications as seen (optionally filter by type). |

**Notifications — CASE chain resolving post_id across 5 notification types**
```sql
CASE
  WHEN n.type IN ('new_post', 'post_tag')  THEN n.reference_id
  WHEN n.type = 'comment'                  THEN (SELECT c.post_id FROM comments c WHERE c.comment_id = n.reference_id)
  WHEN n.type = 'comment_reply'            THEN (SELECT c.post_id FROM comment_replies r
                                                   JOIN comments c ON c.comment_id = r.comment_id
                                                   WHERE r.reply_id = n.reference_id)
  WHEN n.type = 'like'                     THEN (SELECT CASE
                                                   WHEN l.target_type LIKE 'post%' THEN l.target_id
                                                   WHEN l.target_type LIKE 'comment%' THEN
                                                     (SELECT c.post_id FROM comments c WHERE c.comment_id = l.target_id)
                                                 END FROM likes l WHERE l.like_id = n.reference_id)
  ELSE NULL
END AS post_id
```

---

### AI Content Moderation

Applied automatically to posts, comments, and stories before they are written to the database.

| Content type | Model | Trigger |
|---|---|---|
| Text (captions, comments) | Google Gemini 2.5 Flash | `createPost`, `updatePost`, `createComment` |
| Images | TensorFlow MobileNet (local) | `createPost`, `updatePost`, `createStory` |

When either check returns flagged, the `flagged` column is set to `TRUE` on the row. Users with `hide_inappropriate = TRUE` will not see flagged content in their feed, comments, or stories — except their own.

---

## Database Logic

### Stored Procedures

Procedures are called explicitly from the server using `CALL`.

---

#### `accept_friend_request(p_sender_id, p_receiver_id)`

Atomically accepts a friend request in two steps. Uses `LEAST`/`GREATEST` to enforce normalized ordering in the `friends` table (`friend1_id` is always the smaller ID). Raises an exception if the request doesn't exist.

```sql
CREATE OR REPLACE PROCEDURE accept_friend_request(p_sender_id INT, p_receiver_id INT)
LANGUAGE plpgsql AS $$
BEGIN
  -- 1. Mark accepted (raises if not found)
  UPDATE friend_requests SET status = 'accepted'
  WHERE sender_id = p_sender_id AND receiver_id = p_receiver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found from user % to user %', p_sender_id, p_receiver_id;
  END IF;

  -- 2. Insert friendship with normalized ordering
  INSERT INTO friends (friend1_id, friend2_id)
  VALUES (LEAST(p_sender_id, p_receiver_id), GREATEST(p_sender_id, p_receiver_id))
  ON CONFLICT DO NOTHING;
END;
$$;
```

---

#### `delete_user_account(p_user_id)`

Safely deletes a user. The `content_media` table uses a polymorphic `reference_id` with no FK, so ON DELETE CASCADE alone isn't sufficient. This procedure manually collects post and comment IDs, bulk-deletes their media using `ARRAY_AGG` + `ANY()`, removes all notifications involving the user (including as `actor_id`), and finally deletes the user row — letting CASCADE handle the rest.

```sql
CREATE OR REPLACE PROCEDURE delete_user_account(p_user_id INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_post_ids    INT[];
  v_comment_ids INT[];
BEGIN
  SELECT ARRAY_AGG(post_id) INTO v_post_ids FROM posts WHERE user_id = p_user_id;
  IF v_post_ids IS NOT NULL THEN
    DELETE FROM content_media WHERE type = 'post' AND reference_id = ANY(v_post_ids);
  END IF;

  SELECT ARRAY_AGG(comment_id) INTO v_comment_ids FROM comments
  WHERE user_id = p_user_id OR post_id = ANY(v_post_ids);
  IF v_comment_ids IS NOT NULL THEN
    DELETE FROM content_media WHERE type = 'comment' AND reference_id = ANY(v_comment_ids);
  END IF;

  DELETE FROM notifications WHERE user_id = p_user_id OR actor_id = p_user_id;
  DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
  DELETE FROM users WHERE user_id = p_user_id;  -- CASCADE handles the rest
END;
$$;
```

---

### Functions

Functions return values and are called inline inside SQL queries.

---

#### `get_friend_status(user_a, user_b) → VARCHAR(20)`

Returns one of: `SELF`, `FRIENDS`, `SENT`, `RECEIVED`, or `NONE`. Called both as a standalone API endpoint (`GET /friends/status/:id`) and inline in the `getUserPosts` WHERE clause to enforce private profile access.

```sql
CREATE OR REPLACE FUNCTION get_friend_status(user_a INT, user_b INT)
RETURNS VARCHAR(20) LANGUAGE plpgsql AS $$
DECLARE req_sender_id INT;
BEGIN
  IF user_a = user_b THEN RETURN 'SELF'; END IF;

  IF EXISTS (
    SELECT 1 FROM friends
    WHERE (friend1_id = user_a AND friend2_id = user_b)
       OR (friend1_id = user_b AND friend2_id = user_a)
  ) THEN RETURN 'FRIENDS'; END IF;

  SELECT sender_id INTO req_sender_id FROM friend_requests
  WHERE ((sender_id = user_a AND receiver_id = user_b)
      OR (sender_id = user_b AND receiver_id = user_a))
    AND status = 'pending'
  LIMIT 1;

  IF req_sender_id IS NULL THEN     RETURN 'NONE';
  ELSIF req_sender_id = user_a THEN RETURN 'SENT';
  ELSE                              RETURN 'RECEIVED';
  END IF;
END;
$$;
```

---

#### `get_unread_notifications_count(p_user_id) → INTEGER`

Returns the count of notifications where `is_seen = FALSE`. Called in `GET /notifications` to attach the badge count to the response alongside the notification list.

```sql
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id INT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications WHERE user_id = p_user_id AND is_seen = FALSE;
  RETURN v_count;
END;
$$;
```

---

### Triggers

All notification triggers insert into the `notifications` table automatically — no application code required. The `actor_id` column identifies who performed the action so the UI can display "Alice liked your post."

---

#### `trg_friend_request_sent` — AFTER INSERT ON `friend_requests`

Notifies the receiver when a friend request arrives.

```sql
CREATE OR REPLACE FUNCTION notify_friend_request_sent() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  VALUES (NEW.receiver_id, NEW.sender_id, 'friend_request', NEW.request_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_friend_request_accepted` — AFTER UPDATE ON `friend_requests`

Notifies the original sender when their request is accepted. Guarded by `OLD.status = 'pending' AND NEW.status = 'accepted'` to prevent duplicate notifications on other updates.

```sql
CREATE OR REPLACE FUNCTION notify_friend_request_accepted() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (NEW.sender_id, NEW.receiver_id, 'friend_request_accepted', NEW.request_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_message_sent` — AFTER INSERT ON `messages`

Fans out a notification to every conversation member except the sender. Works for both DMs and group chats.

```sql
CREATE OR REPLACE FUNCTION notify_message_sent() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  SELECT user_id, NEW.sender_id, 'message', NEW.message_id
  FROM conversation_members
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_comment_added` — AFTER INSERT ON `comments`

Notifies the post owner when someone comments. Skips self-notification.

```sql
CREATE OR REPLACE FUNCTION notify_comment_added() RETURNS TRIGGER AS $$
DECLARE post_owner_id INTEGER;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE post_id = NEW.post_id;
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (post_owner_id, NEW.user_id, 'comment', NEW.comment_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_comment_reply_added` — AFTER INSERT ON `comment_replies`

Notifies the author of the parent comment when someone replies to them.

```sql
CREATE OR REPLACE FUNCTION notify_comment_reply_added() RETURNS TRIGGER AS $$
DECLARE parent_commenter_id INTEGER;
BEGIN
  SELECT user_id INTO parent_commenter_id FROM comments WHERE comment_id = NEW.comment_id;
  IF parent_commenter_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (parent_commenter_id, NEW.user_id, 'comment_reply', NEW.reply_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_like_added` — AFTER INSERT ON `likes`

Handles the polymorphic `target_type`. Resolves the owner from `posts` or `comments` depending on the prefix, then notifies them. Message reactions (`message_reaction:*`) are silently skipped.

```sql
CREATE OR REPLACE FUNCTION notify_like_added() RETURNS TRIGGER AS $$
DECLARE target_owner_id INTEGER;
BEGIN
  IF NEW.target_type LIKE 'post%' THEN
    SELECT user_id INTO target_owner_id FROM posts WHERE post_id = NEW.target_id;
  ELSIF NEW.target_type LIKE 'comment%' THEN
    SELECT user_id INTO target_owner_id FROM comments WHERE comment_id = NEW.target_id;
  ELSE
    RETURN NEW;  -- message reactions: skip
  END IF;

  IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (target_owner_id, NEW.user_id, 'like', NEW.like_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_post_created` — AFTER INSERT ON `posts`

Fans out a `new_post` notification to every friend of the author. Uses a CASE on the `friends` table to resolve the "other" user regardless of which column they're stored in.

```sql
CREATE OR REPLACE FUNCTION notify_post_to_friends() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  SELECT
    CASE WHEN friend1_id = NEW.user_id THEN friend2_id ELSE friend1_id END,
    NEW.user_id, 'new_post', NEW.post_id
  FROM friends
  WHERE friend1_id = NEW.user_id OR friend2_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_tag_added` — AFTER INSERT ON `post_tags`

Notifies a user when they are tagged in a post.

```sql
CREATE OR REPLACE FUNCTION notify_tagged_user() RETURNS TRIGGER AS $$
DECLARE author_id INTEGER;
BEGIN
  SELECT user_id INTO author_id FROM posts WHERE post_id = NEW.post_id;
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  VALUES (NEW.tagged_user_id, author_id, 'post_tag', NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### `trg_flag_*` — AFTER INSERT OR UPDATE ON `posts`, `comments`, `comment_replies`, `content_media`, `stories`

One function applied to five tables via five separate triggers. Inserts a record into `content_moderation` whenever a row's `flagged` column becomes `TRUE`. Uses `TG_TABLE_NAME` and `TG_OP` to identify the source dynamically.

```sql
CREATE OR REPLACE FUNCTION log_flagged_content() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.flagged = TRUE)
  OR (TG_OP = 'UPDATE' AND OLD.flagged = FALSE AND NEW.flagged = TRUE) THEN
    INSERT INTO content_moderation (target_type, target_id, reason, confidence_score)
    VALUES (
      TG_TABLE_NAME,
      CASE
        WHEN TG_TABLE_NAME = 'posts'          THEN NEW.post_id
        WHEN TG_TABLE_NAME = 'comments'       THEN NEW.comment_id
        WHEN TG_TABLE_NAME = 'comment_replies' THEN NEW.reply_id
        WHEN TG_TABLE_NAME = 'content_media'  THEN NEW.media_id
        WHEN TG_TABLE_NAME = 'stories'        THEN NEW.story_id
      END,
      'AI_FLAGGED: Inappropriate content detected.',
      0.85
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Authors

[@ishmamzarif](https://github.com/ishmamzarif)

## License

[MIT](LICENSE)
