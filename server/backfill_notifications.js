require('dotenv').config();
const pool = require('./db/db');

async function run() {
    console.log('Starting notification backfill...\n');
    let total = 0;

    // 1. Backfill LIKES (non-self only)
    const likes = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT p.user_id, l.user_id, 'like', l.like_id
        FROM likes l
        JOIN posts p ON p.post_id = l.target_id
        WHERE l.target_type LIKE 'post%'
          AND l.user_id != p.user_id
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.type = 'like' AND n.reference_id = l.like_id
          )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Likes backfilled: ${likes.rowCount}`);
    total += likes.rowCount;

    // 2. Backfill COMMENT LIKES
    const commentLikes = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT c.user_id, l.user_id, 'like', l.like_id
        FROM likes l
        JOIN comments c ON c.comment_id = l.target_id
        WHERE l.target_type LIKE 'comment%'
          AND l.user_id != c.user_id
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.type = 'like' AND n.reference_id = l.like_id
          )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Comment likes backfilled: ${commentLikes.rowCount}`);
    total += commentLikes.rowCount;

    // 3. Backfill COMMENTS (notify post owner)
    const comments = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT p.user_id, c.user_id, 'comment', c.comment_id
        FROM comments c
        JOIN posts p ON p.post_id = c.post_id
        WHERE c.user_id != p.user_id
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.type = 'comment' AND n.reference_id = c.comment_id
          )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Comments backfilled: ${comments.rowCount}`);
    total += comments.rowCount;

    // 4. Backfill COMMENT REPLIES (notify parent commenter)
    const replies = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT c.user_id, r.user_id, 'comment_reply', r.reply_id
        FROM comment_replies r
        JOIN comments c ON c.comment_id = r.comment_id
        WHERE r.user_id != c.user_id
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.type = 'comment_reply' AND n.reference_id = r.reply_id
          )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Comment replies backfilled: ${replies.rowCount}`);
    total += replies.rowCount;

    // 5. Backfill MESSAGES (notify all members except sender)
    const messages = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT cm.user_id, m.sender_id, 'message', m.message_id
        FROM messages m
        JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
        WHERE cm.user_id != m.sender_id
          AND NOT EXISTS (
              SELECT 1 FROM notifications n
              WHERE n.type = 'message' AND n.reference_id = m.message_id AND n.user_id = cm.user_id
          )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Messages backfilled: ${messages.rowCount}`);
    total += messages.rowCount;

    // 6. Backfill NEW POSTS (notify all friends)
    const posts = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT 
            CASE WHEN f.friend1_id = p.user_id THEN f.friend2_id ELSE f.friend1_id END,
            p.user_id,
            'new_post',
            p.post_id
        FROM posts p
        JOIN friends f ON f.friend1_id = p.user_id OR f.friend2_id = p.user_id
        WHERE NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.type = 'new_post' AND n.reference_id = p.post_id
              AND n.user_id = CASE WHEN f.friend1_id = p.user_id THEN f.friend2_id ELSE f.friend1_id END
        )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ New post notifications backfilled: ${posts.rowCount}`);
    total += posts.rowCount;

    // 7. Backfill POST TAGS
    const tags = await pool.query(`
        INSERT INTO notifications (user_id, actor_id, type, reference_id)
        SELECT pt.tagged_user_id, p.user_id, 'post_tag', pt.post_id
        FROM post_tags pt
        JOIN posts p ON p.post_id = pt.post_id
        WHERE NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.type = 'post_tag' AND n.reference_id = pt.post_id AND n.user_id = pt.tagged_user_id
        )
        ON CONFLICT DO NOTHING
    `);
    console.log(`✅ Post tags backfilled: ${tags.rowCount}`);
    total += tags.rowCount;

    console.log(`\nTotal notifications inserted: ${total}`);

    // Verify final count
    const countRes = await pool.query(`SELECT type, COUNT(*) as count FROM notifications GROUP BY type ORDER BY count DESC`);
    console.log('\n=== NOTIFICATIONS IN DB NOW ===');
    countRes.rows.forEach(r => console.log(`  ${r.type}: ${r.count}`));

    process.exit();
}

run().catch(e => { console.error('Backfill failed:', e.message); process.exit(1); });
