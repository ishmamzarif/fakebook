const { GoogleGenerativeAI } = require("@google/generative-ai");
const mobilenet = require("@tensorflow-models/mobilenet");
const tf = require("@tensorflow/tfjs");
const fs = require("fs");
const { decode } = require("jpeg-js"); // Need this for manual JPG decoding if tf.node isn't used

// Initialize Gemini
let modelText;
if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is missing. Content moderation will be disabled (defaulting to safe).");
} else {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use the latest flash model as verified by the user
    modelText = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (error) {
    console.error("Failed to initialize Gemini Model:", error);
  }
}

let net;

/**
 * Load Mobilenet model once
 */
async function loadModel() {
  if (!net) {
    net = await mobilenet.load();
  }
}

/**
 * Moderates text using Google Gemini
 * @param {string} text 
 * @returns {Promise<boolean>} returns true if content is inappropriate
 */
async function checkText(text) {
  if (!text || text.trim() === "" || !modelText) return false;

  try {
    const prompt = `Analyze the following text for inappropriate content (toxicity, hate speech, harassment, sexually explicit material, or violence). 
    Respond with ONLY 'TRUE' if it is inappropriate, and 'FALSE' if it is safe.
    
    Text: "${text}"`;

    const result = await modelText.generateContent(prompt);
    const response = await result.response;
    const decision = response.text().trim().toUpperCase();

    return decision.includes("TRUE");
  } catch (error) {
    console.error("Gemini Moderation Error:", error);
    return false; // Fail safe (or fail open, depends on policy)
  }
}

/**
 * Moderates image using Mobilenet
 * @param {string} path Local file path
 * @returns {Promise<boolean>} returns true if content is inappropriate
 */
async function checkImage(path) {
  try {
    await loadModel();
    const imageBuffer = fs.readFileSync(path);
    
    // Decode JPG to raw data
    const pixels = decode(imageBuffer, { useTArray: true });
    const { width, height, data } = pixels;
    
    // Convert to Tensor
    const numChannels = 3;
    const numPixels = width * height;
    const values = new Int32Array(numPixels * numChannels);
    
    for (let i = 0; i < numPixels; i++) {
      for (let j = 0; j < numChannels; j++) {
        values[i * numChannels + j] = data[i * 4 + j];
      }
    }
    
    const tensor = tf.tensor3d(values, [height, width, numChannels], "int32");

    const predictions = await net.classify(tensor);
    tensor.dispose(); // Free memory

    const badKeywords = [
      "weapon", "gun", "knife", "blood", "violence",
      "explosion", "war", "rifle", "pistol", "assault", "bomb",
    ];

    for (let pred of predictions) {
      const label = pred.className.toLowerCase();
      // Check if any bad keyword is in the prediction label with > 0.5 probability
      if (badKeywords.some(k => label.includes(k)) && pred.probability > 0.5) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Image Moderation Error:", error);
    return false;
  }
}

module.exports = {
  checkText,
  checkImage
};
