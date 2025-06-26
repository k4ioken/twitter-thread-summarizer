// gemini/summarize.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function summarizeWithGemini(text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `Summarize this Twitter thread:\n\n${text}`
    );
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to summarize with Gemini");
  }
}

module.exports = summarizeWithGemini;
