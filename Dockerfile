# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available) and tsconfig.json
COPY package*.json tsconfig.json ./

# Install all dependencies (dev and production)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript code (outputs to ./dist)
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist

# Set production environment variable
ENV NODE_ENV=production

# Expose the port the service listens on (adjust if necessary)
EXPOSE 3000

# Run the service
CMD ["node", "dist/server.js"]
