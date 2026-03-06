FROM node:20-alpine AS builder

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build the app
RUN npm run build

# Production image
FROM node:20-alpine

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production

WORKDIR /app

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/start.js .

# Expose port
EXPOSE 3000

# start.js prints the banner then loads server.js
CMD ["node", "start.js"]
