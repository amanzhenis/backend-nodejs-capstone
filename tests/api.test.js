const { test, after } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const connectToDatabase = require('../secondChance-backend/models/db')
const app = require('../secondChance-backend/app')
const sentiment = require('../sentiment/index')
after(async () => { await connectToDatabase.close() })
test('registration, credentials, identity and item lifecycle', async () => {
  const email = 'integration-' + Date.now() + '@example.test'
  const account = { firstName: 'Test', lastName: 'User', email, password: 'Test-password-123' }
  const signup = await request(app).post('/api/auth/register').send(account).expect(201)
  const token = signup.body.authtoken
  assert.ok(token)
  await request(app).post('/api/auth/register').send(account).expect(409)
  await request(app).post('/api/auth/login').send({ email, password: 'incorrect' }).expect(401)
  const login = await request(app).post('/api/auth/login').send(account).expect(200)
  assert.equal(login.body.userEmail, email)
  await request(app).put('/api/auth/update').send({ name: 'Intruder' }).expect(401)
  const profile = await request(app).put('/api/auth/update').set('Authorization', 'Bearer ' + token).send({ name: 'Updated', email: 'someone-else@example.test' }).expect(200)
  assert.equal(profile.body.user.email, email)
  assert.equal(profile.body.user.password, undefined)
  await request(app).post('/api/secondchance/items').send({ name: 'Unauthorized' }).expect(401)
  const payload = { name: 'Integration lamp', category: 'Office', condition: 'New', zipcode: '10110', description: 'Reusable lamp', age_days: 1 }
  const item = await request(app).post('/api/secondchance/items').set('Authorization', 'Bearer ' + token).send(payload).expect(201)
  const id = item.body.id
  assert.ok(id)
  await request(app).get('/api/secondchance/items/' + id).expect(200)
  const search = await request(app).get('/api/secondchance/search?category=Office&name=Integration').expect(200)
  assert.ok(search.body.some(value => value.id === id))
  const comments = await Promise.all(['First review', 'Second review'].map(comment => request(app).post('/api/secondchance/items/' + id + '/comments').set('Authorization', 'Bearer ' + token).send({ comment }).expect(201)))
  assert.equal(comments.length, 2)
  const reviewed = await request(app).get('/api/secondchance/items/' + id).expect(200)
  assert.equal(reviewed.body.comments.length, 2)
  await request(app).delete('/api/secondchance/items/' + id).set('Authorization', 'Bearer ' + token).expect(200)
  await request(app).get('/api/secondchance/items/' + id).expect(404)
})
test('sentiment scores and input validation', async () => {
  await request(sentiment).post('/sentiment').send({}).expect(400)
  for (const [sentence, expected] of [['I love this wonderful gift', 'positive'], ['I hate this terrible broken thing', 'negative'], ['This is a table', 'neutral']]) {
    const result = await request(sentiment).post('/sentiment').send({ sentence }).expect(200)
    assert.equal(result.body.sentiment, expected)
  }
})
