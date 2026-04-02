
-- Backfill existing notifications with actor_id based on their type and reference_id

-- 1. Friend Requests
UPDATE notifications n
SET actor_id = fr.sender_id
FROM friend_requests fr
WHERE n.type = 'friend_request' 
  AND n.reference_id = fr.request_id 
  AND n.actor_id IS NULL;

-- 2. Friend Request Accepted
UPDATE notifications n
SET actor_id = fr.receiver_id
FROM friend_requests fr
WHERE n.type = 'friend_request_accepted' 
  AND n.reference_id = fr.request_id 
  AND n.actor_id IS NULL;

-- 3. Messages
UPDATE notifications n
SET actor_id = ms.sender_id
FROM messages ms
WHERE n.type = 'message' 
  AND n.reference_id = ms.message_id 
  AND n.actor_id IS NULL;

-- 4. Comments
UPDATE notifications n
SET actor_id = c.user_id
FROM comments c
WHERE n.type = 'comment' 
  AND n.reference_id = c.comment_id 
  AND n.actor_id IS NULL;

-- 5. Comment Replies
UPDATE notifications n
SET actor_id = cr.user_id
FROM comment_replies cr
WHERE n.type = 'comment_reply' 
  AND n.reference_id = cr.reply_id 
  AND n.actor_id IS NULL;

-- 6. Likes
UPDATE notifications n
SET actor_id = l.user_id
FROM likes l
WHERE n.type = 'like' 
  AND n.reference_id = l.like_id 
  AND n.actor_id IS NULL;

-- 7. Post Tags & New Posts
UPDATE notifications n
SET actor_id = p.user_id
FROM posts p
WHERE (n.type = 'post_tag' OR n.type = 'new_post') 
  AND n.reference_id = p.post_id 
  AND n.actor_id IS NULL;
