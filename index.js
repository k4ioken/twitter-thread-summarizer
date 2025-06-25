// index.js

require('dotenv').config() // Load environment variables
const { TwitterApi } = require('twitter-api-v2')
// ✅ App-level (Bearer) client
const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN)
const express = require('express')              // Web framework
const bodyParser = require('body-parser')       // Parses POST form data
const path = require('path')                    // Utility for directory paths
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)


const app = express()
const PORT = process.env.PORT || 3000           // Port fallback
async function summarizeWithGemini(text) {
  try {
    // Initialize Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Send prompt to generate summary
    const result = await model.generateContent(
      `Summarize the following tweet in one short paragraph:\n\n${text}`
    );

    // Extract text from Gemini response
    const response = await result.response;
    return response.text().trim();

  } catch (error) {
    // Log and rethrow to be handled in route
    console.error("Gemini API error:", error);
    throw new Error("Failed to summarize with Gemini");
  }
}
// Set EJS as view engine and set views folder
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Serve static files (e.g., public/styles.css if added later)
app.use(express.static(path.join(__dirname, 'public')))

// Parse form input data
app.use(bodyParser.urlencoded({ extended: true }))

// Route: render homepage form
app.get('/', (req, res) => {
  res.render('index') // Renders views/index.ejs
})

// Route: handle form POST
app.post('/summarize', async (req, res) => {
  const tweetUrl = req.body.url.trim()
  const parts = tweetUrl.split("/")
  const lastPart = parts[parts.length - 1]
  const tweetId = Number(lastPart)

  if (!Number.isInteger(tweetId) || tweetId <= 0) {
    return res.send("❌ Invalid tweet URL. It must end with a numeric tweet ID.")
  }

  try {
  //const tweet = await twitterClient.v2.singleTweet(tweetId)
  //const tweetText = tweet.data?.text
  const tweetText = `
Building a Twitter bot in Node.js was easier than I expected. 
Used Twitter API v2, Express for the frontend, and a GPT model for summaries.
Thinking of turning this into a tool for quick news briefings!
`;

  if (!tweetText) {
    return res.send("❌ Couldn't retrieve tweet text.")
  }
  const summary = await summarizeWithGemini(tweetText);

    res.send(`
  <h2>📝 Original Tweet</h2>
  <pre>${tweetText}</pre>
  <h2>📌 Summary (via Gemini Flash)</h2>
  <p style="
  max-width: 60ch;
  word-wrap: break-word;
  white-space: normal;
  font-family: sans-serif;
  line-height: 1.5;
">
  ${summary}
</p>

`);

} catch (error) {
  console.error("Twitter or Gemini error:", error)
  return res.send("❌ Failed to fetch and summarize tweet.")
}
})


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
