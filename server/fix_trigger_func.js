require('dotenv').config();
const pool = require('./db/db');

async function fixFunc() {
    try {
        const sql = `
CREATE OR REPLACE FUNCTION public.log_flagged_content()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_target_id INTEGER;
BEGIN
    -- Only log if flagged changed from false to true OR was true on insert
    IF (TG_OP = 'INSERT' AND NEW.flagged = TRUE) OR 
       (TG_OP = 'UPDATE' AND OLD.flagged = FALSE AND NEW.flagged = TRUE) THEN
        
        IF TG_TABLE_NAME = 'posts' THEN
            v_target_id := (row_to_json(NEW)->>'post_id')::INTEGER;
        ELSIF TG_TABLE_NAME = 'comments' THEN
            v_target_id := (row_to_json(NEW)->>'comment_id')::INTEGER;
        ELSIF TG_TABLE_NAME = 'comment_replies' THEN
            v_target_id := (row_to_json(NEW)->>'reply_id')::INTEGER;
        ELSIF TG_TABLE_NAME = 'content_media' THEN
            v_target_id := (row_to_json(NEW)->>'media_id')::INTEGER;
        ELSIF TG_TABLE_NAME = 'stories' THEN
            v_target_id := (row_to_json(NEW)->>'story_id')::INTEGER;
        END IF;

        INSERT INTO content_moderation (target_type, target_id, reason, confidence_score)
        VALUES (
            TG_TABLE_NAME, 
            v_target_id,
            'AI_FLAGGED: Inappropriate content detected.',
            0.85 
        );
    END IF;
    RETURN NEW;
END;
$function$
        `;
        await pool.query(sql);
        console.log("Trigger function fixed.");
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
fixFunc();
