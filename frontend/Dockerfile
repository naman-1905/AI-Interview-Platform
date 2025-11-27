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

# Install a lightweight static file server to host the built assets
RUN npm install -g serve

# Copy only the compiled frontend output
COPY --from=builder /app/dist ./dist

EXPOSE 5173

# Serve the production build
CMD ["serve", "-s", "dist", "-l", "5173", "--single"]
