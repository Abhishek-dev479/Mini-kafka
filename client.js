const net = require('net');

class Client {
  constructor(port, host = 'localhost') {
    this.socket = net.createConnection({ port, host });
    this.requestId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);

    this.setupListeners();
  }

  setupListeners() {
    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);

      while (this.buffer.length >= 4) {
        const totalLength = this.buffer.readUInt32BE(0);
        if (this.buffer.length < totalLength) break;

        let offset = 4;

        const version = this.buffer.readUInt8(offset); offset++;
        const type = this.buffer.readUInt8(offset); offset++;
        const requestId = this.buffer.readUInt32BE(offset); offset += 4;

        const payload = JSON.parse(
          this.buffer.slice(offset, totalLength).toString()
        );

        const handler = this.pending.get(requestId);
        if (handler) {
          handler.resolve(payload);
          this.pending.delete(requestId);
        }

        this.buffer = this.buffer.slice(totalLength);
      }
    });

    this.socket.on('error', (err) => {
      for (const { reject } of this.pending.values()) {
        reject(err);
      }
      this.pending.clear();
    });
  }


    send(type, payload) {
    return new Promise((resolve, reject) => {
      const payloadBuffer = Buffer.from(JSON.stringify(payload));

      const totalLength = 4 + 1 + 1 + 4 + payloadBuffer.length;
      const buffer = Buffer.alloc(totalLength);

      let offset = 0;

      const id = this.requestId++;

      buffer.writeUInt32BE(totalLength, offset); offset += 4;
      buffer.writeUInt8(1, offset++);
      buffer.writeUInt8(type, offset++);
      buffer.writeUInt32BE(id, offset); offset += 4;

      payloadBuffer.copy(buffer, offset);

      this.pending.set(id, { resolve, reject });

      this.socket.write(buffer);
    });
  }
}

module.exports = { Client };
