
-- 1. Notify on Message
CREATE OR REPLACE FUNCTION notify_message_sent()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify each recipient except the sender
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  SELECT user_id, NEW.sender_id, 'message', NEW.message_id
  FROM conversation_members
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_sent
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_message_sent();


-- 2. Notify on Comment
CREATE OR REPLACE FUNCTION notify_comment_added()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id INTEGER;
BEGIN
  SELECT user_id INTO post_owner_id FROM posts WHERE post_id = NEW.post_id;
  
  -- Notify post owner if commenter is not the owner
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (post_owner_id, NEW.user_id, 'comment', NEW.comment_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_added
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION notify_comment_added();


-- 3. Notify on Comment Reply
CREATE OR REPLACE FUNCTION notify_comment_reply_added()
RETURNS TRIGGER AS $$
DECLARE
  parent_commenter_id INTEGER;
BEGIN
  SELECT user_id INTO parent_commenter_id FROM comments WHERE comment_id = NEW.comment_id;
  
  -- Notify parent commenter if replier is not the same person
  IF parent_commenter_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (parent_commenter_id, NEW.user_id, 'comment_reply', NEW.reply_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_reply_added
AFTER INSERT ON comment_replies
FOR EACH ROW
EXECUTE FUNCTION notify_comment_reply_added();


-- 4. Notify on Like
CREATE OR REPLACE FUNCTION notify_like_added()
RETURNS TRIGGER AS $$
DECLARE
  target_owner_id INTEGER;
BEGIN
  IF NEW.target_type LIKE 'post%' THEN
    SELECT user_id INTO target_owner_id FROM posts WHERE post_id = NEW.target_id;
  ELSIF NEW.target_type LIKE 'comment%' THEN
    SELECT user_id INTO target_owner_id FROM comments WHERE comment_id = NEW.target_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Notify owner if liker is not the owner
  IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (target_owner_id, NEW.user_id, 'like', NEW.like_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_added
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION notify_like_added();


-- 5. Notify on Post Creation (To Friends)
CREATE OR REPLACE FUNCTION notify_post_to_friends()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all friends of the author
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  SELECT 
    CASE WHEN friend1_id = NEW.user_id THEN friend2_id ELSE friend1_id END,
    NEW.user_id,
    'new_post',
    NEW.post_id
  FROM friends
  WHERE friend1_id = NEW.user_id OR friend2_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_created
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION notify_post_to_friends();


-- 6. Notify on Tagging
CREATE OR REPLACE FUNCTION notify_tagged_user()
RETURNS TRIGGER AS $$
DECLARE
  author_id INTEGER;
BEGIN
  SELECT user_id INTO author_id FROM posts WHERE post_id = NEW.post_id;
  
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  VALUES (NEW.tagged_user_id, author_id, 'post_tag', NEW.post_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tag_added
AFTER INSERT ON post_tags
FOR EACH ROW
EXECUTE FUNCTION notify_tagged_user();
