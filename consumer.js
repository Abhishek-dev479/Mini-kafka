const net = require('net');
const { Client } = require('./client');


const client = new Client(8080);

(async () => {
  await client.send(4, { // JOIN_GROUP
    groupId: "group1",
    consumerId: "consumer1"
  });

  const res = await client.send(2, { // CONSUME
    topic: "orders",
    groupId: "group1",
    consumerId: "consumer1" 
  });

  console.log(res);
})();