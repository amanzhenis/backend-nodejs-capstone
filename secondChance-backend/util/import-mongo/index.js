const connectToDatabase = require('../../models/db')
const data = require('./secondChanceItems.json').docs
async function loadData () {
  const db = await connectToDatabase()
  const collection = db.collection('secondChanceItems')
  if (await collection.countDocuments() === 0) {
    const result = await collection.insertMany(data)
    console.log('Inserted documents:', result.insertedCount)
  }
  console.log('Total documents:', await collection.countDocuments())
}
if (require.main === module) loadData().then(() => connectToDatabase.close()).catch(error => { console.error(error); process.exit(1) })
module.exports = { loadData }
