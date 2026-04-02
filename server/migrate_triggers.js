require('dotenv').config();
const pool = require('./db/db');

const statements = [

  // 1. MESSAGES
  `CREATE OR REPLACE FUNCTION notify_message_sent()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    SELECT user_id, NEW.sender_id, 'message', NEW.message_id
    FROM conversation_members
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_message_sent ON messages`,

  `CREATE TRIGGER trg_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_sent()`,

  // 2. COMMENTS
  `CREATE OR REPLACE FUNCTION notify_comment_added()
  RETURNS TRIGGER AS $$
  DECLARE
    post_owner_id INTEGER;
  BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE post_id = NEW.post_id;
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (post_owner_id, NEW.user_id, 'comment', NEW.comment_id);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_comment_added ON comments`,

  `CREATE TRIGGER trg_comment_added
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_added()`,

  // 3. COMMENT REPLIES
  `CREATE OR REPLACE FUNCTION notify_comment_reply_added()
  RETURNS TRIGGER AS $$
  DECLARE
    parent_commenter_id INTEGER;
  BEGIN
    SELECT user_id INTO parent_commenter_id FROM comments WHERE comment_id = NEW.comment_id;
    IF parent_commenter_id IS NOT NULL AND parent_commenter_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (parent_commenter_id, NEW.user_id, 'comment_reply', NEW.reply_id);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_comment_reply_added ON comment_replies`,

  `CREATE TRIGGER trg_comment_reply_added
  AFTER INSERT ON comment_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_reply_added()`,

  // 4. LIKES / REACTS
  `CREATE OR REPLACE FUNCTION notify_like_added()
  RETURNS TRIGGER AS $$
  DECLARE
    target_owner_id INTEGER;
  BEGIN
    IF NEW.target_type LIKE 'post%' THEN
      SELECT user_id INTO target_owner_id FROM posts WHERE post_id = NEW.target_id;
    ELSIF NEW.target_type LIKE 'comment%' THEN
      SELECT user_id INTO target_owner_id FROM comments WHERE comment_id = NEW.target_id;
    END IF;

    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (target_owner_id, NEW.user_id, 'like', NEW.like_id);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_like_added ON likes`,

  `CREATE TRIGGER trg_like_added
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_like_added()`,

  // 5. NEW POST → NOTIFY FRIENDS
  `CREATE OR REPLACE FUNCTION notify_post_to_friends()
  RETURNS TRIGGER AS $$
  BEGIN
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
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_post_created ON posts`,

  `CREATE TRIGGER trg_post_created
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_to_friends()`,

  // 6. POST TAG
  `CREATE OR REPLACE FUNCTION notify_tagged_user()
  RETURNS TRIGGER AS $$
  DECLARE
    author_id INTEGER;
  BEGIN
    SELECT user_id INTO author_id FROM posts WHERE post_id = NEW.post_id;
    IF author_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (NEW.tagged_user_id, author_id, 'post_tag', NEW.post_id);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_tag_added ON post_tags`,

  `CREATE TRIGGER trg_tag_added
  AFTER INSERT ON post_tags
  FOR EACH ROW
  EXECUTE FUNCTION notify_tagged_user()`,

  // 7. FRIEND REQUEST (update actor_id)
  `CREATE OR REPLACE FUNCTION notify_friend_request_sent()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    VALUES (NEW.receiver_id, NEW.sender_id, 'friend_request', NEW.request_id);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `CREATE OR REPLACE FUNCTION notify_friend_request_accepted()
  RETURNS TRIGGER AS $$
  BEGIN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (NEW.sender_id, NEW.receiver_id, 'friend_request_accepted', NEW.request_id);
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

];

async function run() {
  console.log('Starting trigger migration — running each statement individually...\n');
  let success = 0;
  let failed = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    const label = stmt.split('\n')[0].substring(0, 70);
    try {
      await pool.query(stmt);
      console.log(`  ✅ [${i + 1}/${statements.length}] ${label}`);
      success++;
    } catch (err) {
      console.error(`  ❌ [${i + 1}/${statements.length}] ${label}`);
      console.error(`     Error: ${err.message}\n`);
      failed++;
    }
  }
  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
