const http = require('http');

// Prepare the request data
const data = JSON.stringify({
  prompt: 'multiply 6 times 4 and also explain how you got the answer',
  model: 'claude-3-7-sonnet-20250219'
});

// Set up the request options
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/claude/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'x-api-key': 'HrithikApiKey'
  }
};

// Make the request
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let buffer = '';
  
  res.on('data', (chunk) => {
    // Add the chunk to our buffer
    buffer += chunk.toString();
    
    // Process complete SSE messages
    const messages = buffer.split('\n\n');
    buffer = messages.pop(); // Keep the last incomplete chunk
    
    for (const message of messages) {
      if (message.startsWith('data: ')) {
        try {
          const eventData = JSON.parse(message.slice(6));
          
          if (eventData.type === 'chunk') {
            // Text chunk - print without newline
            process.stdout.write(eventData.text || '');
          } else if (eventData.type === 'tool-call') {
            // Tool call - print details
            console.log('\nUsing tool:', eventData.toolName);
            console.log('With input:', JSON.stringify(eventData.toolInput));
          } else if (eventData.type === 'tool-result') {
            // Tool result - print details
            console.log('\nTool result:', JSON.stringify(eventData.result));
          } else if (eventData.type === 'done') {
            // Stream completed
            console.log('\n--- Stream completed ---');
          } else {
            // Unknown event type
            console.log('\nEvent:', eventData.type, eventData);
          }
        } catch (e) {
          console.log('Error parsing:', message.slice(6), e);
        }
      }
    }
  });
  
  res.on('end', () => {
    console.log('\nConnection closed');
  });
  
  res.on('error', (e) => {
    console.error('Response error:', e.message);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();

// Print a message when the request is sent
console.log('Request sent, waiting for response...');