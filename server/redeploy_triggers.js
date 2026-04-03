require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL.includes("?") ? "&ssl=true" : "?ssl=true"),
});

const statements = [
    // 1. MESSAGES → NOTIFY
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
    `CREATE TRIGGER trg_message_sent AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_message_sent()`,

    // 2. COMMENTS → NOTIFY POST OWNER
    `CREATE OR REPLACE FUNCTION notify_comment_added()
    RETURNS TRIGGER AS $$
    DECLARE post_owner_id INTEGER;
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
    `CREATE TRIGGER trg_comment_added AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION notify_comment_added()`,

    // 3. FLAGGED CONTENT LOGGING
    `CREATE OR REPLACE FUNCTION log_flagged_content()
    RETURNS TRIGGER AS $$
    DECLARE target_owner_id INTEGER; target_id INTEGER;
    BEGIN
        IF (TG_OP = 'INSERT' AND NEW.flagged = TRUE) OR 
           (TG_OP = 'UPDATE' AND OLD.flagged = FALSE AND NEW.flagged = TRUE) THEN
            
            IF TG_TABLE_NAME = 'posts' THEN 
                target_owner_id := NEW.user_id; target_id := NEW.post_id;
            ELSIF TG_TABLE_NAME = 'comments' THEN 
                target_owner_id := NEW.user_id; target_id := NEW.comment_id;
            ELSIF TG_TABLE_NAME = 'stories' THEN 
                target_owner_id := NEW.user_id; target_id := NEW.story_id;
            ELSIF TG_TABLE_NAME = 'content_media' THEN
                target_id := NEW.media_id;
            END IF;

            -- Log to content_moderation
            INSERT INTO content_moderation (target_type, target_id, reason, confidence_score)
            VALUES (TG_TABLE_NAME, target_id, 'AI_FLAGGED', 0.85);

            -- Notify owner
            IF target_owner_id IS NOT NULL THEN
                INSERT INTO notifications (user_id, actor_id, type, reference_id)
                VALUES (target_owner_id, NULL, 'content_flagged', target_id);
            END IF;
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql`,

    `DROP TRIGGER IF EXISTS trg_flag_post ON posts`,
    `CREATE TRIGGER trg_flag_post AFTER INSERT OR UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION log_flagged_content()`,
    
    `DROP TRIGGER IF EXISTS trg_flag_comment ON comments`,
    `CREATE TRIGGER trg_flag_comment AFTER INSERT OR UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION log_flagged_content()`,

    `DROP TRIGGER IF EXISTS trg_flag_media ON content_media`,
    `CREATE TRIGGER trg_flag_media AFTER INSERT OR UPDATE ON content_media FOR EACH ROW EXECUTE FUNCTION log_flagged_content()`,
];

async function run() {
  console.log('Deploying triggers...');
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      console.log('✅ Statement success');
    } catch (err) {
      console.error('❌ Statement failed:', err.message);
    }
  }
  process.exit(0);
}
run();
