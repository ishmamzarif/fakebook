require("dotenv").config();
const { checkText } = require("./utils/moderation");
const pool = require("./db/db");

async function testFlagging() {
    const toxicText = "shit fuck";
    console.log(`[Test] Checking text: "${toxicText}"`);

    const isFlagged = await checkText(toxicText);
    console.log(`[Test] Moderation result: ${isFlagged}`);

    if (isFlagged) {
        console.log("[Test] Success: Logic detected toxic text.");
    } else {
        console.error("[Test] ERROR: Logic failed to detect toxic text.");
    }

    process.exit(isFlagged ? 0 : 1);
}

testFlagging();
