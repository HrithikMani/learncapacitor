
const mongoose = require('mongoose');

// Define schema for individual messages
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
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