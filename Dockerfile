FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY server/package.json ./
RUN npm install --production

# Copy app
COPY server/ ./
COPY client/ ../client/

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
