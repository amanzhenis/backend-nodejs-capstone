const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { randomUUID } = require('crypto')
const connectToDatabase = require('../models/db')
const { authenticate } = require('./authRoutes')
const router = express.Router()
const directory = path.join(__dirname, '../public/images')
fs.mkdirSync(directory, { recursive: true })
const upload = multer({
  storage: multer.diskStorage({ destination: directory, filename: (req, file, done) => done(null, randomUUID() + path.extname(file.originalname).toLowerCase()) }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, done) => done(null, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype))
})
const fields = ['name', 'category', 'condition', 'zipcode', 'description']
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    res.json(await db.collection('secondChanceItems').find({}).toArray())
  } catch (error) { next(error) }
})
router.post('/', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!fields.every(field => typeof req.body[field] === 'string' && req.body[field].trim())) return res.status(400).json({ error: 'All item fields are required' })
    const age = Number(req.body.age_days || 0)
    if (!Number.isFinite(age) || age < 0) return res.status(400).json({ error: 'Age must be a non-negative number' })
    const db = await connectToDatabase()
    const item = Object.fromEntries(fields.map(field => [field, req.body[field].trim()]))
    Object.assign(item, { id: randomUUID(), posted_by: req.user.id, age_days: age, age_years: Number((age / 365).toFixed(2)), date_added: Math.floor(Date.now() / 1000), comments: [], image: req.file ? '/images/' + req.file.filename : '' })
    await db.collection('secondChanceItems').insertOne(item)
    res.status(201).json(item)
  } catch (error) { next(error) }
})
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const item = await db.collection('secondChanceItems').findOne({ id: req.params.id })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (error) { next(error) }
})
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const changes = Object.fromEntries(fields.filter(field => typeof req.body[field] === 'string').map(field => [field, req.body[field].trim()]))
    const item = await db.collection('secondChanceItems').findOneAndUpdate({ id: req.params.id, posted_by: req.user.id }, { $set: changes }, { returnDocument: 'after' })
    if (!item) return res.status(404).json({ error: 'Item not found or not owned by you' })
    res.json(item)
  } catch (error) { next(error) }
})
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const result = await db.collection('secondChanceItems').deleteOne({ id: req.params.id, posted_by: req.user.id })
    if (!result.deletedCount) return res.status(404).json({ error: 'Item not found or not owned by you' })
    res.json({ message: 'Item deleted' })
  } catch (error) { next(error) }
})
router.post('/:id/comments', authenticate, async (req, res, next) => {
  try {
    if (typeof req.body.comment !== 'string' || !req.body.comment.trim()) return res.status(400).json({ error: 'Comment is required' })
    const db = await connectToDatabase()
    const comment = { id: randomUUID(), author: req.user.name, comment: req.body.comment.trim(), date_added: new Date().toISOString() }
    const item = await db.collection('secondChanceItems').findOneAndUpdate({ id: req.params.id }, { $push: { comments: comment } }, { returnDocument: 'after' })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.status(201).json(comment)
  } catch (error) { next(error) }
})
module.exports = router
