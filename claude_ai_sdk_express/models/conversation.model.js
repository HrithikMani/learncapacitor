const mongoose = require('mongoose');

// Define schema for individual messages with support for structured content
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // This allows for both string and array of objects
    required: true
  },
  id: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Define schema for conversation sessions
const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: function() {
      return `Conversation ${new Date().toLocaleDateString()}`;
    }
  },
  messages: [messageSchema],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => new Map()
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Create Conversation model
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;