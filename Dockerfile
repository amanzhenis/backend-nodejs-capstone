FROM node:22-bookworm-slim AS ui
WORKDIR /ui
COPY secondChance-frontend/package*.json ./
RUN npm ci
COPY secondChance-frontend/ ./
ENV CI=false
RUN npm run build
FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
COPY secondChance-backend/package*.json ./secondChance-backend/
COPY sentiment/package*.json ./sentiment/
RUN npm ci --omit=dev
COPY secondChance-backend/ ./secondChance-backend/
COPY sentiment/ ./sentiment/
COPY --from=ui /ui/build ./secondChance-frontend/build
RUN mkdir -p secondChance-backend/public/images && chown -R node:node /app
USER node
ENV NODE_ENV=production PORT=3060
EXPOSE 3060
CMD ["node", "secondChance-backend/app.js"]
