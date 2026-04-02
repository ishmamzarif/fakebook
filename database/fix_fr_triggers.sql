
-- Update friend request triggers to use actor_id
CREATE OR REPLACE FUNCTION notify_friend_request_sent()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, actor_id, type, reference_id)
  VALUES (NEW.receiver_id, NEW.sender_id, 'friend_request', NEW.request_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (NEW.sender_id, NEW.receiver_id, 'friend_request_accepted', NEW.request_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
