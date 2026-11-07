# SecondChance

A household-item sharing application built from the IBM JavaScript Back-end Capstone template. The supplied React frontend is integrated with Express APIs, MongoDB, JWT authentication and a Natural sentiment service.

## Run locally

Requirements: Node.js 22 and MongoDB 6 or later.

```sh
npm ci
cp .env.example .env
# Set JWT_SECRET to a freshly generated random value.
node secondChance-backend/util/import-mongo/index.js
npm ci --prefix secondChance-frontend
npm run build --prefix secondChance-frontend
node secondChance-backend/app.js
```

Open `http://localhost:3060` for the landing page and `/app` for the catalog. Run `node sentiment/index.js` to expose `POST /sentiment` on port 3000.

## API

- `GET /api/secondchance/items` lists the catalog; `GET /api/secondchance/items/:id` returns an item or 404.
- `POST /api/secondchance/items` accepts JSON or multipart form data with a `file` image. Create, update and delete operations require a bearer token. Only an item's owner can change or delete it.
- `GET /api/secondchance/search` supports name, category, condition and maximum age filters.
- `POST /api/auth/register` hashes passwords and rejects duplicate emails. `POST /api/auth/login` checks credentials and issues a one-hour JWT.
- `GET /api/auth/profile` and `PUT /api/auth/update` use the authenticated identity rather than trusting a client-supplied email.
- `POST /api/secondchance/items/:id/comments` atomically appends a review, preserving concurrent submissions.
- `POST /sentiment` accepts a sentence and returns its score and negative, neutral or positive classification.

The catalog initializer imports 16 supplied sample records. Item illustrations are locally generated SVG placeholders. The Kubernetes MongoDB volume is temporary and intended for this educational lab; production deployment should use persistent storage and backups.

## Verification and deployment

```sh
npm run lint
JWT_SECRET=test-only MONGO_DB=secondChance_test npm test
docker build -t secondchance .
```

CI/CD runs lint, integration tests against a MongoDB service, and a production container build. Tests cover duplicate registration, invalid credentials, authenticated profile updates, item creation/search/deletion, concurrent review writes and sentiment validation.

`deploy/lab.sh` builds and publishes the image to the Skills Network registry, creates a fresh JWT secret and applies the Kubernetes resources. The frontend and APIs share an HTTPS Skills Network application URL through Kubernetes port forwarding. The MongoDB service is internal to the namespace. Never commit `.env` files, real passwords or signing keys.
