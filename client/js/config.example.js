// Environment Configuration Template
// Copy this file to config.js and update with your values

const CONFIG = {
  // Backend API URL
  API_BASE_URL: 'http://localhost:5000/api', // Change to your deployed backend URL
  SOCKET_URL: 'http://localhost:5000',       // Change to your deployed backend URL
  
  // Environment
  ENV: 'development' // 'development' or 'production'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
