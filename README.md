# Mini Kafka

A simple Kafka-like message broker implementation in Node.js.

## Features

- Produce and consume messages
- Topic partitioning
- Consumer groups
- HTTP API for monitoring
- TCP protocol for clients

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Run producer:
   ```bash
   KAFKA_HOST=localhost node producer.js
   ```

4. Run consumer:
   ```bash
   KAFKA_HOST=localhost node consumer.js
   ```

The server runs on:
- TCP: port 8080
- HTTP: port 3000

## Running with Docker

### Prerequisites

- Docker and Docker Compose installed

### Build and Run

1. Build the images:
   ```bash
   docker-compose build
   ```

2. Start the services:
   ```bash
   docker-compose up
   ```

   This will start the server, run the producer once, and run the consumer once.

3. To run only the server:
   ```bash
   docker-compose up server
   ```

4. To run producer separately:
   ```bash
   docker-compose run --rm producer
   ```

5. To run consumer separately:
   ```bash
   docker-compose run --rm consumer
   ```

### Accessing the Web Interface

Once the server is running, open http://localhost:3000 in your browser to view topics and partitions.

### Data Persistence

The `data` directory is mounted as a volume, so messages persist between container restarts.

## Deploying to Render

Render supports deploying Docker containers for web services. Since this project includes both HTTP and TCP components, note that only the HTTP API will be accessible externally on Render.

### Prerequisites

- GitHub account
- Render account
- Code pushed to a GitHub repository

### Deployment Steps

1. **Push code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Docker support"
   git push origin master
   ```

2. **Create a new Web Service on Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this project

3. **Configure the service**:
   - **Runtime**: Docker
   - **Build Command**: Leave empty (Render will use the Dockerfile)
   - **Start Command**: Leave empty (uses CMD from Dockerfile)
   - **Port**: Render will automatically detect from the Dockerfile EXPOSE

4. **Environment Variables** (optional):
   - No specific variables needed, but you can add `NODE_ENV=production` if desired

5. **Deploy**:
   - Click "Create Web Service"
   - Render will build the Docker image and deploy it

### Accessing the Deployed Service

- The HTTP API will be available at the URL provided by Render (e.g., `https://your-service.onrender.com`)
- You can view topics at `https://your-service.onrender.com/topics`

### Running TCP Clients

Since Render only exposes HTTP ports, the TCP server (port 8080) is not externally accessible. To use the producer and consumer:

1. Run the server locally:
   ```bash
   npm start
   ```

2. Update producer/consumer to connect to localhost:
   ```bash
   KAFKA_HOST=localhost node producer.js
   KAFKA_HOST=localhost node consumer.js
   ```

For a full cloud deployment with TCP support, consider platforms like DigitalOcean or AWS that support TCP deployments.