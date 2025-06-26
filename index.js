require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { TwitterApi } = require('twitter-api-v2');
const summarizeWithGemini = require('./gemini/summarize');
const extractTweetId = require('./twitter/extract-id');

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET
});

const client = twitterClient.readWrite;

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.render('index', { summary: null, error: null });
});

app.post('/summarize', async (req, res) => {
  const tweetUrl = req.body.tweetUrl?.trim();

  if (!tweetUrl) {
    console.log('❌ No URL submitted');
    return res.render('index', { summary: null, error: 'No URL submitted' });
  }

  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    console.log('❌ Invalid Tweet URL format');
    return res.render('index', { summary: null, error: 'Invalid Tweet URL' });
  }

  console.log(`🔎 Extracted Tweet ID: ${tweetId}`);
   try {
    // ✅ Check who owns the token
    const me = await client.v2.me();
    console.log("🔐 Bearer token belongs to:", me.data.username);

    if (me.data.username !== 'g0nz0g0') {
      return res.render('index', {
        summary: null,
        error: '❌ Your Bearer token does not belong to @g0nz0g0. Tweet access is restricted.'
      });
    }

    // 🔽 your fetch + summarize logic continues here

  } catch (err) {
    console.error("❌ Error during summarize flow:", err);

    return res.render('index', {
      summary: null,
      error: '❌ An unexpected error occurred. Check console for details.'
    });
  }

  try {
    console.log(`📡 Fetching single tweet ${tweetId}...`);
    const tweet = await client.v2.singleTweet(tweetId, {
      'tweet.fields': ['author_id', 'conversation_id']
    });

    console.log('Raw tweet response:', tweet);

if (!tweet || typeof tweet !== 'object' || !tweet.data || typeof tweet.data.text !== 'string') {
  return res.render('index', {
    summary: null,
    error: '❌ Could not fetch tweet text (invalid structure or missing data).'
  });
}


    const { author_id, conversation_id } = tweet.data;
    console.log(`✅ Tweet fetched. Author: ${author_id}, Conversation: ${conversation_id}`);

    console.log(`📡 Searching full thread using conversation_id...`);
    const thread = await client.v2.search(
      `conversation_id:${conversation_id} from:${author_id}`,
      {
        max_results: 100,
        'tweet.fields': ['created_at']
      }
    );

    const tweets = thread.data?.data;
    if (!tweets || tweets.length === 0) {
      console.log('❌ No tweets found in thread');
      return res.render('index', {
        summary: null,
        error: 'Thread not found or empty'
      });
    }

    console.log(`✅ Thread fetched. Total tweets: ${tweets.length}`);
    tweets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const fullThread = tweets.map(t => t.text).join('\n\n');

    console.log(`📤 Sending thread to Gemini...`);
    const summary = await summarizeWithGemini(fullThread);
    console.log(`✅ Gemini summary generated.`);

    res.render('index', { summary, error: null });

  } catch (err) {
    console.error('🔥 Error during summarize flow:', err);
    res.render('index', {
      summary: null,
      error: 'Failed to fetch or summarize thread'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
