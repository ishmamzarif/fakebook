require("dotenv").config();
const { checkText, checkImage } = require("./utils/moderation");

async function test() {
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
    
    for (const modelName of models) {
        console.log(`\n--- Testing model: ${modelName} ---`);
        try {
            const genAI = new (require("@google/generative-ai").GoogleGenerativeAI)(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Respond with 'OK'");
            console.log(`Model ${modelName} is working! Response: ${result.response.text()}`);
            break; // Found one!
        } catch (e) {
            console.log(`Model ${modelName} failed: ${e.message}`);
        }
    }

    console.log("\n--- Image Moderation Test ---");
    // We don't have a bad image handy, but we can test if the model loads
    console.log("Testing image moderation (loading model)...");
    try {
        // Just a dummy path to see if it reaches the classifier
        await checkImage("non_existent.jpg"); 
    } catch (e) {
        console.log("Expected error (file not found), but check if TF loaded.");
    }
}

test().then(() => process.exit(0));
