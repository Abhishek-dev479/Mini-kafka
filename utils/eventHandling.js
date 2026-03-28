function handleResponse(producer, pending, buffer){
  producer.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const totalLength = buffer.readUInt32BE(0);

      if (buffer.length < totalLength) break;

      let offset = 4;

      const version = buffer.readUInt8(offset); offset++;
      const type = buffer.readUInt8(offset); offset++;
      const requestId = buffer.readUInt32BE(offset); offset += 4;

      const payload = JSON.parse(
        buffer.slice(offset, totalLength).toString()
      );

      pending.get(requestId)?.resolve(payload);

    //   console.log("Response:", payload+" for requestId: "+requestId);

      buffer = buffer.slice(totalLength);
    }
  });
}

function handleError(producer, pending){
    producer.on('error', (err) => {
  for (const { reject } of pending.values()) {
    reject(err);
  }
  pending.clear();
});
}

module.exports = { handleResponse, handleError }