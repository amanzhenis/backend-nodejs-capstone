require('dotenv').config()
const express = require('express')
const natural = require('natural')
const app = express()
app.use(express.json({ limit: '100kb' }))
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn')
app.post('/sentiment', (req, res) => {
  const { sentence } = req.body
  if (typeof sentence !== 'string' || !sentence.trim()) return res.status(400).json({ error: 'No sentence provided' })
  try {
    const sentimentScore = analyzer.getSentiment(sentence.trim().split(/\s+/))
    const sentiment = sentimentScore < 0 ? 'negative' : sentimentScore <= 0.33 ? 'neutral' : 'positive'
    res.json({ sentimentScore, sentiment })
  } catch { res.status(500).json({ message: 'Error performing sentiment analysis' }) }
})
if (require.main === module) app.listen(process.env.PORT || 3000)
module.exports = app
