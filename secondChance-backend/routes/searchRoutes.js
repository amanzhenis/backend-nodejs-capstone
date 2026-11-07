const router = require('express').Router()
const connectToDatabase = require('../models/db')
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const query = {}
    for (const field of ['name', 'category', 'condition']) {
      if (typeof req.query[field] === 'string' && req.query[field]) {
        const escaped = req.query[field].slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        query[field] = { $regex: field === 'name' ? escaped : '^' + escaped + '$', $options: 'i' }
      }
    }
    if (req.query.age_years) {
      const age = Number(req.query.age_years)
      if (!Number.isFinite(age) || age < 0) return res.status(400).json({ error: 'Invalid age filter' })
      query.age_years = { $lte: age }
    }
    res.json(await db.collection('secondChanceItems').find(query).toArray())
  } catch (error) { next(error) }
})
module.exports = router
