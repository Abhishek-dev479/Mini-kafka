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