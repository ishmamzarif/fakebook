const { GoogleGenerativeAI } = require("@google/generative-ai");
const mobilenet = require("@tensorflow-models/mobilenet");
const tf = require("@tensorflow/tfjs");
const fs = require("fs");
const { decode } = require("jpeg-js"); // Fallback for Node environments without native decodeImage

// Initialize Gemini
let modelText;
if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is missing. Content moderation will be disabled (defaulting to safe).");
} else {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    modelText = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log("Gemini moderation model initialized (gemini-2.5-flash).");
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
    try {
      net = await mobilenet.load();
    } catch (error) {
      console.error("Failed to load MobileNet model:", error);
    }
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

    console.log(`[Moderation] Text check result: ${decision}`);
    return decision.includes("TRUE");
  } catch (error) {
    console.error("Gemini Moderation Error:", error);
    return false;
  }
}

/**
 * Moderates image using MobileNet via manually decoded pixels
 * @param {string} filePath Local file path
 * @returns {Promise<boolean>} returns true if content is inappropriate
 */
async function checkImage(filePath) {
  try {
    await loadModel();
    if (!net) return false;

    const imageBuffer = fs.readFileSync(filePath);

    // Manually decode JPEG pixels
    let pixels;
    try {
      pixels = decode(imageBuffer, { useTArray: true });
    } catch (decodeError) {
      // If jpeg-js fails, we log and return false (safe) to prevent server crash
      console.warn("Image decoding failed (unsupported format or corrupted):", decodeError.message);
      return false;
    }

    const { width, height, data } = pixels;

    // Convert to Tensor [height, width, channels]
    const numChannels = 3;
    const numPixels = width * height;
    const values = new Int32Array(numPixels * numChannels);

    for (let i = 0; i < numPixels; i++) {
      for (let j = 0; j < numChannels; j++) {
        // data is RGBA (4 channels), we only want RGB (3 channels)
        values[i * numChannels + j] = data[i * 4 + j];
      }
    }

    const tensor = tf.tensor3d(values, [height, width, numChannels], "int32");

    const predictions = await net.classify(tensor);
    tensor.dispose();

    const badKeywords = [
      "weapon", "gun", "knife", "blood", "violence",
      "explosion", "war", "rifle", "pistol", "assault", "bomb",
    ];

    for (const pred of predictions) {
      const label = pred.className.toLowerCase();
      if (badKeywords.some(k => label.includes(k)) && pred.probability > 0.5) {
        console.log(`[Moderation] Image flagged — label: "${pred.className}", confidence: ${pred.probability.toFixed(2)}`);
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
