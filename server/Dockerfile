FROM node:22-alpine

RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your Fastify app uses
EXPOSE 3000

RUN npx prisma generate
RUN npm run build

# Start the Fastify server
CMD ["npm", "run", "dev"]