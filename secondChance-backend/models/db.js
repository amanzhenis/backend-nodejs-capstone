require('dotenv').config()
const { MongoClient } = require('mongodb')
let connection
let client
async function connectToDatabase () {
  if (!connection) {
    client = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017')
    connection = (async () => {
      await client.connect()
      const db = client.db(process.env.MONGO_DB || 'secondChance')
      await db.collection('users').createIndex({ email: 1 }, { unique: true })
      await db.collection('secondChanceItems').createIndex({ id: 1 }, { unique: true })
      return db
    })().catch(error => { connection = null; throw error })
  }
  return connection
}
connectToDatabase.close = async () => { if (client) await client.close(); connection = null }
module.exports = connectToDatabase
