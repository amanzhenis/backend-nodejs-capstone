const { spawnSync } = require('node:child_process')
const { mkdirSync, writeFileSync } = require('node:fs')
const { randomBytes } = require('node:crypto')
const path = require('node:path')
const base = process.env.APP_URL || 'http://127.0.0.1:3060'
const output = process.env.EVIDENCE_DIR || '/home/project/capstone-evidence'
mkdirSync(output, { recursive: true })
const password = randomBytes(18).toString('hex')
const account = { firstName: 'Demo', lastName: 'Reviewer', email: 'secondchance-demo-' + Date.now() + '@example.test', password }
function capture (name, args) {
  const allArgs = ['-i', '-sS', '--max-time', '30', ...args]
  const result = spawnSync('curl', allArgs, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || 'cURL failed')
  const status = result.stdout.match(/^HTTP\/\S+ (\d+)/)
  if (!status || !['200', '201'].includes(status[1])) throw new Error('Unexpected response: ' + result.stdout.slice(0, 300))
  const safe = value => value.replaceAll(password, '[REDACTED demo password]').replace(/"authtoken"\s*:\s*"[^"]+"/g, '"authtoken":"[REDACTED demo token]"')
  const command = '$ curl ' + allArgs.map(value => "'" + value.replaceAll("'", "'\\''") + "'").join(' ')
  writeFileSync(path.join(output, name), 'Actual cURL command and response. Demo credentials and tokens have been redacted.\n\n' + safe(command) + '\n\n' + safe(result.stdout) + '\n')
  return JSON.parse(result.stdout.slice(result.stdout.indexOf('\r\n\r\n') + 4))
}
const items = capture('mainpage', [base + '/api/secondchance/items'])
if (items.length !== 16) throw new Error('Expected the 16 imported records')
capture('register', ['-X', 'POST', base + '/api/auth/register', '-H', 'Content-Type: application/json', '--data', JSON.stringify(account)])
capture('login', ['-X', 'POST', base + '/api/auth/login', '-H', 'Content-Type: application/json', '--data', JSON.stringify({ email: account.email, password })])
capture('item_detail', [base + '/api/secondchance/items/' + items[0].id])
const filtered = capture('search_item', [base + '/api/secondchance/search?category=' + encodeURIComponent(items[0].category)])
if (!filtered.length || filtered.some(item => item.category !== items[0].category)) throw new Error('Category filter failed')
console.log('Verified 16 catalog items, registration, login, item detail and category search; saved actual cURL responses.')
