### Frontend Dockerfile for AI Interview Platform (Vite build + preview server)

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=5173

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --production

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
