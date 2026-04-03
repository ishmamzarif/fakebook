require("dotenv").config();
const { checkText, checkImage } = require("./utils/moderation");
const path = require("path");

async function testModeration() {
    console.log("--- Testing AI Moderation ---");

    // 1. Test Gemini Text Moderation
    const safeText = "Hello, what a beautiful day in the park!";
    const toxicText = "I hate you and I will hurt you if I see you again. Go away!";

    console.log(`Checking safe text: "${safeText}"`);
    const safeResult = await checkText(safeText);
    console.log(`Result: ${safeResult ? "FLAGGED" : "SAFE"}`);

    console.log(`Checking toxic text: "${toxicText}"`);
    const toxicResult = await checkText(toxicText);
    console.log(`Result: ${toxicResult ? "FLAGGED" : "SAFE"}`);

    // 2. Test TensorFlow Image Moderation (Optional, needs a real file)
    console.log("\n--- Testing Image Moderation (if file exists) ---");
    // You can manually provide a path to a test image here
    const testImagePath = path.join(__dirname, "temp", "test_image.jpg"); 
    // This is just a placeholder until you provide a real image.
}

testModeration();
