async function loadTopics() {
  try {
    const res = await fetch('/topics');
    const data = await res.json();
    const topicsList = document.getElementById('topics-list');
    topicsList.innerHTML = '';
    for (const topic of data.topics) {
      const topicDiv = document.createElement('div');
      topicDiv.className = 'mb-3';
      topicDiv.innerHTML = `<h4>${topic}</h4><div id="partitions-${topic}"></div>`;
      topicsList.appendChild(topicDiv);
      loadPartitions(topic);
    }
  } catch (error) {
    console.error('Error loading topics:', error);
  }
}

async function loadPartitions(topic) {
  try {
    const res = await fetch(`/topics/${topic}`);
    const data = await res.json();
    const partitionsDiv = document.getElementById(`partitions-${topic}`);
    partitionsDiv.innerHTML = '';
    for (const p of data.partitions) {
      const pDiv = document.createElement('div');
      pDiv.className = 'd-flex justify-content-between align-items-center mb-2';
      pDiv.innerHTML = `
        <span>Partition ${p.partition}: ${p.messageCount} messages</span>
        <button class="btn btn-sm btn-outline-primary" onclick="viewMessages('${topic}', ${p.partition})">View</button>
      `;
      partitionsDiv.appendChild(pDiv);
    }
  } catch (error) {
    console.error('Error loading partitions:', error);
  }
}

function viewMessages(topic, partition) {
  fetch(`/topics/${topic}/partitions/${partition}`)
    .then(res => res.json())
    .then(data => {
      const content = document.getElementById('messages-content');
      content.innerHTML = '';
      if (data.messages.length === 0) {
        content.innerHTML = '<p>No messages</p>';
      } else {
        data.messages.forEach(msg => {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'message';
          msgDiv.innerHTML = `
            <strong>Offset:</strong> ${msg.offset}<br>
            <strong>Key:</strong> ${msg.key || 'N/A'}<br>
            <strong>Value:</strong> ${msg.value}
          `;
          content.appendChild(msgDiv);
        });
      }
      const modal = new bootstrap.Modal(document.getElementById('messagesModal'));
      modal.show();
    })
    .catch(error => {
      console.error('Error loading messages:', error);
    });
}

document.getElementById('produceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const topic = document.getElementById('topic').value;
  const message = document.getElementById('message').value;
  const key = document.getElementById('key').value || undefined;
  try {
    const res = await fetch('/produce', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({topic, message, key})
    });
    const data = await res.json();
    alert('Produced: ' + JSON.stringify(data));
    loadTopics();
  } catch (error) {
    console.error('Error producing message:', error);
    alert('Error producing message');
  }
});

loadTopics();