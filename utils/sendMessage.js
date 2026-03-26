let requestId = 1;
let pending = new Map();
export async function sendMessage(socket, type, payload) {
  return new Promise((resolve, reject) => {
    const payloadBuffer = Buffer.from(JSON.stringify(payload));

    const headerSize = 4 + 1 + 1 + 4; // totalLength + version + type + requestId
    const totalLength = headerSize + payloadBuffer.length;

    const buffer = Buffer.alloc(totalLength);

    let offset = 0;

    buffer.writeUInt32BE(totalLength, offset); offset += 4;
    buffer.writeUInt8(1, offset); offset += 1; // version
    buffer.writeUInt8(type, offset); offset += 1;
    buffer.writeUInt32BE(requestId++, offset); offset += 4;

    payloadBuffer.copy(buffer, offset);
    pending.set(requestId - 1, {resolve, reject})

    socket.write(buffer);
  });
}