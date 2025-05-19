// Load environment variables if not already loaded
require('dotenv').config();

/**
 * Authentication middleware
 * Verifies the API key in the request headers
 */
exports.authenticate = (req, res, next) => {
  try {
    // Check if API_KEY is defined
    if (!process.env.API_KEY) {
      console.error('ERROR: API_KEY is not defined in environment variables');
      return res.status(500).json({
        status: 'error',
        message: 'Server configuration error: API authentication not properly configured'
      });
    }
    
    const apiKey = req.headers['x-api-key'];
    
    // Log for debugging (don't log in production)
    console.log('Authentication attempt:', {
      receivedKey: apiKey ? '[PRESENT]' : '[MISSING]',
      expectedKey: '[CONFIGURED]'
    });
    
    if (!apiKey) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Unauthorized. Missing API key. Please provide x-api-key header.' 
      });
    }
    
    if (apiKey !== process.env.API_KEY) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Unauthorized. Invalid API key.' 
      });
    }
    
    // Authentication successful
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Authentication error',
      error: error.message 
    });
  }
};