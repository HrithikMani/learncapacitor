# Express API with Claude AI SDK

This project provides a RESTful API for interacting with the Claude AI models using Express.js and the Anthropic Claude AI SDK.

## Features

- Connect to Claude AI models via API
- Maintain conversation context with session management
- Secure API with authentication middleware
- Complete conversation history management

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Anthropic API key (from [Anthropic Console](https://console.anthropic.com/))

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/express-claude-api.git
   cd express-claude-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the project root
   - Add the following variables:
     ```
     ANTHROPIC_API_KEY=your_anthropic_api_key_here
     PORT=3000
     API_KEY=your_secret_api_key_for_authentication
     ```

## Project Structure

```
.
├── .env                  # Environment variables
├── package.json          # Project metadata and dependencies
├── server.js             # Main application entry point
├── controllers/
│   └── claude.controller.js  # Controllers for Claude AI interactions
├── routes/
│   └── claude.js          # API route definitions
└── middleware/
    └── auth.middleware.js  # Authentication middleware
```

## API Endpoints

### Chat with Claude

```
POST /api/claude/chat
```

**Headers:**
- Content-Type: application/json
- x-api-key: your_api_key

**Request Body:**
```json
{
  "prompt": "Your message to Claude",
  "sessionId": "unique-session-identifier",
  "model": "claude-3-7-sonnet-20250219",
  "maxTokens": 1000,
  "system": "You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.",
  "temperature": 0.7
}
```

Only `prompt` and `sessionId` are required; other fields are optional with defaults.

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Claude's response text",
    "usage": {
      "input_tokens": 10,
      "output_tokens": 50
    },
    "model": "claude-3-7-sonnet-20250219",
    "session_id": "unique-session-identifier"
  }
}
```

### Get Conversation History

```
GET /api/claude/history/:sessionId
```

**Headers:**
- x-api-key: your_api_key

**Response:**
```json
{
  "status": "success",
  "data": {
    "session_id": "unique-session-identifier",
    "messages": [
      {
        "role": "user",
        "content": "Hello, Claude!"
      },
      {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      }
    ],
    "message_count": 2
  }
}
```

### Clear Conversation History

```
DELETE /api/claude/history/:sessionId
```

**Headers:**
- x-api-key: your_api_key

**Response:**
```json
{
  "status": "success",
  "message": "Conversation history cleared successfully",
  "session_id": "unique-session-identifier"
}
```

## Running the Server

### Development mode:
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on the port specified in the `.env` file (default: 3000).

## Production Considerations

For production deployment:

1. Replace the in-memory message history with a database (MongoDB, PostgreSQL, etc.)
2. Implement rate limiting
3. Use a more robust authentication system
4. Add proper logging
5. Deploy behind a reverse proxy (Nginx, Apache)
6. Use process managers like PM2

## License

MIT

## Author

Your Name