// Environment Configuration
// Change these values based on your deployment environment

const CONFIG = {
  // Backend API URL (change for production)
  API_BASE_URL: 'http://localhost:5000/api',
  SOCKET_URL: 'http://localhost:5000',
  
  // For production deployment, use:
  // API_BASE_URL: 'https://sharecart.onrender.com/api',
  // SOCKET_URL: 'https://sharecart.onrender.com',
  
  // Environment
  ENV: 'development' // 'development' or 'production'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
