const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { ObjectId } = require('mongodb')
const connectToDatabase = require('../models/db')
function authenticate (req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /i, '') || req.headers['auth-token']
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next() } catch { res.status(401).json({ error: 'Authentication required' }) }
}
function session (user) {
  const authtoken = jwt.sign({ id: user._id.toString(), name: user.firstName, user: { id: user._id.toString() } }, process.env.JWT_SECRET, { expiresIn: '1h' })
  return { authtoken, userName: user.firstName, userEmail: user.email, email: user.email }
}
router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    if (![firstName, lastName].every(value => typeof value === 'string' && value.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Valid names, email and password (8-72 bytes) are required' })
    const db = await connectToDatabase()
    const user = { firstName: firstName.trim(), lastName: lastName.trim(), email, password: await bcrypt.hash(password, 12) }
    await db.collection('users').insertOne(user)
    res.status(201).json(session(user))
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Email is already in use' })
    next(error)
  }
})
router.post('/login', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const user = await db.collection('users').findOne({ email })
    if (!user || typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).json({ error: 'Invalid email or password' })
    res.json(session(user))
  } catch (error) { next(error) }
})
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) }, { projection: { password: 0 } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (error) { next(error) }
})
router.put('/update', authenticate, async (req, res, next) => {
  try {
    const name = req.body.name || req.body.firstName
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Name is required' })
    const db = await connectToDatabase()
    const user = await db.collection('users').findOneAndUpdate({ _id: new ObjectId(req.user.id) }, { $set: { firstName: name.trim() } }, { returnDocument: 'after', projection: { password: 0 } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ message: 'Profile updated', user })
  } catch (error) { next(error) }
})
module.exports = router
module.exports.authenticate = authenticate
