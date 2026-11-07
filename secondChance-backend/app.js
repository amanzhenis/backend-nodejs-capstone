require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const logger = require('./logger')
const connectToDatabase = require('./models/db')
const authRoutes = require('./routes/authRoutes')
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes')
const searchRoutes = require('./routes/searchRoutes')
const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(require('pino-http')({ logger, redact: ['req.headers.authorization', 'req.headers["auth-token"]'] }))
app.use('/images', express.static(path.join(__dirname, 'public/images')))
app.use('/api/auth', authRoutes)
app.use('/api/secondchance/items', secondChanceItemsRoutes)
app.use('/api/secondchance/search', searchRoutes)
app.get('/health', async (req, res, next) => {
  try { await connectToDatabase(); res.json({ status: 'ok' }) } catch (error) { next(error) }
})
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }))
const frontend = path.join(__dirname, '../secondChance-frontend/build')
if (fs.existsSync(frontend)) {
  app.get('/', (req, res) => res.sendFile(path.join(frontend, 'home.html')))
  app.use(express.static(frontend))
  app.get('*', (req, res) => res.sendFile(path.join(frontend, 'index.html')))
}
app.use((error, req, res, next) => {
  logger.error(error)
  res.status(error instanceof SyntaxError || error.name === 'MulterError' ? 400 : 500).json({ error: 'Unable to process request' })
})
if (require.main === module) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required')
  connectToDatabase().then(() => app.listen(process.env.PORT || 3060, () => logger.info('SecondChance server ready'))).catch(error => { logger.error(error); process.exit(1) })
}
module.exports = app
