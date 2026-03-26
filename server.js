const net = require('net');
const fs = require('fs');
const path = require('path');
const {hash} = require('./utils/hashFunction');

const MESSAGE_TYPES = {
  PRODUCE: 1,
  CONSUME: 2,
  RESPONSE: 3,
  JOIN_GROUP: 4,
};

let offsetCache = {};

function loadOffsets() {
  const baseDir = path.join(__dirname, 'data');

  if (!fs.existsSync(baseDir)) return;

  const topics = fs.readdirSync(baseDir);

  for (const topic of topics) {
    const topicPath = path.join(baseDir, topic);

    offsetCache[topic] = {};

    const files = fs.readdirSync(topicPath);

    for (const file of files) {
      const partition = file.match(/partition-(\d+)\.log/)[1];
      const filePath = path.join(topicPath, file);

      const lines = fs.readFileSync(filePath, 'utf-8')
        .trim()
        .split('\n')
        .filter(Boolean);

      offsetCache[topic][partition] = lines.length;
    }
  }
}

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const totalLength = buffer.readUInt32BE(0);

      if (buffer.length < totalLength) break;

      let offset = 4;

      const version = buffer.readUInt8(offset); offset += 1;
      const type = buffer.readUInt8(offset); offset += 1;
      const requestId = buffer.readUInt32BE(offset); offset += 4;

const payload = JSON.parse(
  buffer.slice(offset, totalLength).toString()
);

      console.log({
        totalLength,
        version,
        type,
        requestId,
        payload: payload.toString(),
      });
      

      handleRequest(socket, type, requestId, payload);

      buffer = buffer.slice(totalLength);
    }
  });
});

function handleRequest(socket, type, requestId, payload) {
  if (type === MESSAGE_TYPES.PRODUCE) {
    handleProduce(socket, requestId, payload);
  }
  else if (type === MESSAGE_TYPES.CONSUME) {
    handleConsume(socket, requestId, payload);
  }
    else if (type === MESSAGE_TYPES.JOIN_GROUP) {
    handleJoinGroup(socket, requestId, payload);
  }
}

const DEFAULT_PARTITIONS = 3;
let partitionCounter = {};

function handleProduce(socket, requestId, { topic, partition, key, message }) {
  // ✅ auto assign partition if not provided
  if (partition === undefined) {
    partition = choosePartition(topic, key);
    console.log('choosen partition: '+partition)
  }

  const dir = path.join(__dirname, 'data', topic);
  const filePath = path.join(dir, `partition-${partition}.log`);

  fs.mkdirSync(dir, { recursive: true });

  // ✅ initialize cache
  if (!offsetCache[topic]) offsetCache[topic] = {};
  if (offsetCache[topic][partition] === undefined) {
    offsetCache[topic][partition] = 0;
  }

  const offset = offsetCache[topic][partition];

  // ✅ store key also (important for debugging / future)
  const logEntry = JSON.stringify({ offset, key, value: message }) + '\n';

  fs.appendFileSync(filePath, logEntry);

  offsetCache[topic][partition]++;

  sendResponse(socket, requestId, {
    status: "OK",
    partition,   // 👈 return partition
    offset
  });
}


function choosePartition(topic, key) {
  // ensure topic exists in offsetCache
  if (!offsetCache[topic]) offsetCache[topic] = {};

  const numPartitions = Math.max(
    DEFAULT_PARTITIONS,
    Object.keys(offsetCache[topic]).length || 0
  );

  // ✅ key-based hashing
  if (key !== undefined) {
    // console.log('choosing partition based on key hash for key: '+key);
    return hash(key) % numPartitions;
  }

  // ✅ round robin fallback
  if (!partitionCounter[topic]) {
    partitionCounter[topic] = 0;
  }

  const partition = partitionCounter[topic] % numPartitions;
  partitionCounter[topic]++;

  return partition;
}


function handleConsume(socket, requestId, { topic, groupId, consumerId }) {
  const group = consumerGroups[groupId];

  if (!group) {
    return sendResponse(socket, requestId, {
      status: "ERROR",
      message: "Group not found"
    });
  }

  // rebalance if needed
  if (!group.assignments[topic]) {
    rebalance(groupId, topic);
  }

  const partitions = Object.entries(group.assignments[topic])
    .filter(([p, c]) => c === consumerId)
    .map(([p]) => parseInt(p));

  let allMessages = [];

  for (const partition of partitions) {
    const offset = group.offsets?.[topic]?.[partition] || 0;

    const filePath = path.join(__dirname, 'data', topic, `partition-${partition}.log`);

    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n');

    const messages = lines.slice(offset).map(line => JSON.parse(line));

    // update offset
    if (!group.offsets[topic]) group.offsets[topic] = {};
    group.offsets[topic][partition] = lines.length;

    allMessages.push(...messages);
  }

  sendResponse(socket, requestId, {
    status: "OK",
    messages: allMessages
  });
}

let consumerGroups = {};

function handleJoinGroup(socket, requestId, { groupId, consumerId }) {
  if (!consumerGroups[groupId]) {
    consumerGroups[groupId] = {
      members: new Set(),
      assignments: {},
      offsets: {}
    };
  }

  consumerGroups[groupId].members.add(consumerId);

  sendResponse(socket, requestId, {
    status: "OK"
  });
}

function rebalance(groupId, topic) {
  const group = consumerGroups[groupId];
  const members = Array.from(group.members);

  const numPartitions = Object.keys(offsetCache[topic] || {}).length;

  group.assignments[topic] = {};

  for (let i = 0; i < numPartitions; i++) {
    const consumer = members[i % members.length];
    group.assignments[topic][i] = consumer;
  }
}

const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/topics', (req, res) => {
  const baseDir = path.join(__dirname, 'data');
  if (!fs.existsSync(baseDir)) {
    return res.json({topics: []});
  }
  const topics = fs.readdirSync(baseDir);
  res.json({topics});
});

app.get('/topics/:topic', (req, res) => {
  const topic = req.params.topic;
  const topicPath = path.join(__dirname, 'data', topic);
  if (!fs.existsSync(topicPath)) {
    return res.status(404).json({error: 'Topic not found'});
  }
  const files = fs.readdirSync(topicPath);
  const partitions = files.map(file => {
    const match = file.match(/partition-(\d+)\.log/);
    if (!match) return null;
    const partition = parseInt(match[1]);
    const filePath = path.join(topicPath, file);
    const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
    return {partition, messageCount: lines.length};
  }).filter(Boolean);
  res.json({partitions});
});

app.get('/topics/:topic/partitions/:partition', (req, res) => {
  const topic = req.params.topic;
  const partition = parseInt(req.params.partition);
  const filePath = path.join(__dirname, 'data', topic, `partition-${partition}.log`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({error: 'Partition not found'});
  }
  const lines = fs.readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
  const messages = lines.map(line => JSON.parse(line));
  res.json({messages});
});

app.post('/produce', (req, res) => {
  const {topic, partition, key, message} = req.body;
  let chosenPartition = partition;
  if (chosenPartition === undefined) {
    chosenPartition = choosePartition(topic, key);
  }
  const dir = path.join(__dirname, 'data', topic);
  const filePath = path.join(dir, `partition-${chosenPartition}.log`);
  fs.mkdirSync(dir, { recursive: true });
  if (!offsetCache[topic]) offsetCache[topic] = {};
  if (offsetCache[topic][chosenPartition] === undefined) {
    offsetCache[topic][chosenPartition] = 0;
  }
  const offset = offsetCache[topic][chosenPartition];
  const logEntry = JSON.stringify({ offset, key, value: message }) + '\n';
  fs.appendFileSync(filePath, logEntry);
  offsetCache[topic][chosenPartition]++;
  res.json({status: "OK", partition: chosenPartition, offset});
});

function sendResponse(socket, requestId, data) {
  const payloadBuffer = Buffer.from(JSON.stringify(data));

  const totalLength = 4 + 1 + 1 + 4 + payloadBuffer.length;

  const buffer = Buffer.alloc(totalLength);

  let offset = 0;

  buffer.writeUInt32BE(totalLength, offset); offset += 4;
  buffer.writeUInt8(1, offset++); // version
  buffer.writeUInt8(3, offset++); // RESPONSE
  buffer.writeUInt32BE(requestId, offset); offset += 4;

  payloadBuffer.copy(buffer, offset);

  socket.write(buffer);
}

server.listen(8080, () => {
    loadOffsets()
  console.log("Server listening on 8080");
});

app.listen(3000, () => {
  console.log("HTTP server listening on 3000");
});