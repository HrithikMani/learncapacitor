const http = require('http');

// Prepare the request data
const data = JSON.stringify({
  prompt: 'multiply 6 times 4',
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
          console.log('Event Type:', eventData.type);
          
          if (eventData.type === 'chunk') {
            process.stdout.write(eventData.text || '');
          } else if (eventData.type === 'tool-call') {
            console.log('\nTool Call:', eventData.toolName);
          } else if (eventData.type === 'tool-result') {
            console.log('\nTool Result:', eventData.result);
          } else if (eventData.type === 'done') {
            console.log('\nStream completed');
          }
        } catch (e) {
          console.log('Raw data:', message.slice(6));
        }
      }
    }
  });
  
  res.on('end', () => {
    console.log('\nNo more data');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();