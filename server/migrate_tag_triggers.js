require('dotenv').config();
const pool = require('./db/db');

const statements = [
  // Updated notify_comment_added — also notifies tagged users
  `CREATE OR REPLACE FUNCTION notify_comment_added()
  RETURNS TRIGGER AS $$
  DECLARE
    post_owner_id INTEGER;
  BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE post_id = NEW.post_id;

    -- Notify post owner
    IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (post_owner_id, NEW.user_id, 'comment', NEW.comment_id);
    END IF;

    -- Also notify tagged users (who aren't the commenter or post owner)
    INSERT INTO notifications (user_id, actor_id, type, reference_id)
    SELECT pt.tagged_user_id, NEW.user_id, 'comment', NEW.comment_id
    FROM post_tags pt
    WHERE pt.post_id = NEW.post_id
      AND pt.tagged_user_id != NEW.user_id
      AND pt.tagged_user_id != post_owner_id;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_comment_added ON comments`,

  `CREATE TRIGGER trg_comment_added
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_added()`,

  // Updated notify_like_added — also notifies tagged users
  `CREATE OR REPLACE FUNCTION notify_like_added()
  RETURNS TRIGGER AS $$
  DECLARE
    target_owner_id INTEGER;
    target_post_id INTEGER;
  BEGIN
    IF NEW.target_type LIKE 'post%' THEN
      SELECT user_id, post_id INTO target_owner_id, target_post_id FROM posts WHERE post_id = NEW.target_id;
    ELSIF NEW.target_type LIKE 'comment%' THEN
      SELECT c.user_id, c.post_id INTO target_owner_id, target_post_id FROM comments c WHERE c.comment_id = NEW.target_id;
    END IF;

    -- Notify content owner
    IF target_owner_id IS NOT NULL AND target_owner_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      VALUES (target_owner_id, NEW.user_id, 'like', NEW.like_id);
    END IF;

    -- Notify tagged users on the post (for post likes only)
    IF NEW.target_type LIKE 'post%' AND target_post_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, actor_id, type, reference_id)
      SELECT pt.tagged_user_id, NEW.user_id, 'like', NEW.like_id
      FROM post_tags pt
      WHERE pt.post_id = target_post_id
        AND pt.tagged_user_id != NEW.user_id
        AND pt.tagged_user_id != target_owner_id;
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS trg_like_added ON likes`,

  `CREATE TRIGGER trg_like_added
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_like_added()`,
];

async function run() {
  console.log('Updating triggers for tagged-post notifications...\n');
  let ok = 0; let fail = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    try {
      await pool.query(stmt);
      console.log(`  ✅ [${i+1}/${statements.length}] ${stmt.split('\n')[0].substring(0,60)}`);
      ok++;
    } catch (err) {
      console.error(`  ❌ [${i+1}/${statements.length}] ${err.message}`);
      fail++;
    }
  }
  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
  process.exit(fail > 0 ? 1 : 0);
}
run();
