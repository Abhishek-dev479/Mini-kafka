import net from 'net';
import {Client} from './client.js ';

const client = new Client(8080, process.env.KAFKA_HOST || 'localhost');

(async () => {
  const res1 = await client.send(1, {
    topic: "orders",
    message: "order1"
  });

  console.log(res1);
})();







