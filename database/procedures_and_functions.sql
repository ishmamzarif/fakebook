-- 1. Procedure to accept a friend request
-- This encapsulates two steps: updating the request status and adding the friendship.
CREATE OR REPLACE PROCEDURE accept_friend_request(
    p_sender_id INT,
    p_receiver_id INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Update friend_requests status to accepted
    UPDATE friend_requests 
    SET status = 'accepted' 
    WHERE sender_id = p_sender_id AND receiver_id = p_receiver_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Friend request not found from user % to user %', p_sender_id, p_receiver_id;
    END IF;

    -- 2. Add to friends table (normalized order: friend1_id < friend2_id)
    INSERT INTO friends (friend1_id, friend2_id) 
    VALUES (
        LEAST(p_sender_id, p_receiver_id), 
        GREATEST(p_sender_id, p_receiver_id)
    )
    ON CONFLICT DO NOTHING;
END;
$$;


-- 2. Function to get friend status between two users
-- Returns 'SELF', 'FRIENDS', 'SENT', 'RECEIVED', or 'NONE'
CREATE OR REPLACE FUNCTION get_friend_status(
    user_a INT,
    user_b INT
)
RETURNS VARCHAR(20)
LANGUAGE plpgsql
AS $$
DECLARE
    status_result VARCHAR(20);
    req_sender_id INT;
BEGIN
    -- Check if it's the same user
    IF user_a = user_b THEN
        RETURN 'SELF';
    END IF;

    -- Check if they are already friends
    IF EXISTS (
        SELECT 1 FROM friends 
        WHERE (friend1_id = user_a AND friend2_id = user_b)
           OR (friend1_id = user_b AND friend2_id = user_a)
    ) THEN
        RETURN 'FRIENDS';
    END IF;

    -- Check for friend requests
    SELECT sender_id INTO req_sender_id
    FROM friend_requests
    WHERE (sender_id = user_a AND receiver_id = user_b)
       OR (sender_id = user_b AND receiver_id = user_a)
    LIMIT 1;

    IF req_sender_id IS NULL THEN
        RETURN 'NONE';
    ELSIF req_sender_id = user_a THEN
        RETURN 'SENT';
    ELSE
        RETURN 'RECEIVED';
    END IF;
END;
$$;


-- 3. Procedure to delete a user account with all associated data
-- This handles manual cleanups for tables without CASCADE delete.
CREATE OR REPLACE PROCEDURE delete_user_account(
    p_user_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_post_ids INT[];
    v_comment_ids INT[];
BEGIN
    -- 1. Get post IDs for manual media cleanup
    SELECT ARRAY_AGG(post_id) INTO v_post_ids FROM posts WHERE user_id = p_user_id;

    -- 2. Cleanup media for posts
    IF v_post_ids IS NOT NULL THEN
        DELETE FROM content_media WHERE type = 'post' AND reference_id = ANY(v_post_ids);
    END IF;

    -- 3. Get comment IDs for manual media cleanup
    -- Includes comments by the user AND comments on the user's posts
    SELECT ARRAY_AGG(comment_id) INTO v_comment_ids 
    FROM comments 
    WHERE user_id = p_user_id OR post_id = ANY(v_post_ids);

    -- 4. Cleanup media for comments
    IF v_comment_ids IS NOT NULL THEN
        DELETE FROM content_media WHERE type = 'comment' AND reference_id = ANY(v_comment_ids);
    END IF;

    -- 5. Delete specific records that might not have CASCADE (e.g., from actor_id or polymorphic refs)
    DELETE FROM notifications WHERE user_id = p_user_id OR actor_id = p_user_id;
    DELETE FROM blocks WHERE blocker_id = p_user_id OR blocked_id = p_user_id;

    -- 6. Finally delete the user record (CASCADE will handle the rest)
    DELETE FROM users WHERE user_id = p_user_id;
END;
$$;


-- 4. Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notifications_count(
    p_user_id INT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE user_id = p_user_id AND is_seen = FALSE;
    
    RETURN v_count;
END;
$$;

-- 5. Trigger Function to automatically log flagged content
CREATE OR REPLACE FUNCTION log_flagged_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if flagged changed from false to true OR was true on insert
    IF (TG_OP = 'INSERT' AND NEW.flagged = TRUE) OR 
       (TG_OP = 'UPDATE' AND OLD.flagged = FALSE AND NEW.flagged = TRUE) THEN
        
        INSERT INTO content_moderation (target_type, target_id, reason, confidence_score)
        VALUES (
            TG_TABLE_NAME, 
            CASE 
                WHEN TG_TABLE_NAME = 'posts' THEN NEW.post_id
                WHEN TG_TABLE_NAME = 'comments' THEN NEW.comment_id
                WHEN TG_TABLE_NAME = 'comment_replies' THEN NEW.reply_id
                WHEN TG_TABLE_NAME = 'content_media' THEN NEW.media_id
                WHEN TG_TABLE_NAME = 'stories' THEN NEW.story_id
                ELSE NULL
            END,
            'AI_FLAGGED: Inappropriate content detected.',
            0.85 
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to relevant tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'posts') THEN
        CREATE TRIGGER trg_flag_post AFTER INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION log_flagged_content();
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'comments') THEN
        CREATE TRIGGER trg_flag_comment AFTER INSERT OR UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION log_flagged_content();
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'comment_replies') THEN
        CREATE TRIGGER trg_flag_reply AFTER INSERT OR UPDATE ON comment_replies FOR EACH ROW EXECUTE FUNCTION log_flagged_content();
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'content_media') THEN
        CREATE TRIGGER trg_flag_media AFTER INSERT OR UPDATE ON content_media FOR EACH ROW EXECUTE FUNCTION log_flagged_content();
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'stories') THEN
        CREATE TRIGGER trg_flag_story AFTER INSERT OR UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION log_flagged_content();
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some triggers could not be created: %', SQLERRM;
END $$;
