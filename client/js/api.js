// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

// API Client
class APIClient {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    setUser(user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(user));
    }

    getToken() {
        return this.token;
    }

    getUser() {
        return this.user;
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth APIs
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (data.success) {
            this.setToken(data.token);
            this.setUser(data.user);
        }
        
        return data;
    }

    async login(credentials) {
        // Support both formats: login({email, password}) or login(email, password)
        const loginData = typeof credentials === 'object' 
            ? credentials 
            : { email: credentials, password: arguments[1] };
            
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });
        
        if (data.success) {
            this.setToken(data.token);
            this.setUser(data.user);
        }
        
        return data;
    }

    async getMe() {
        return await this.request('/auth/me');
    }

    async updateProfile(updates) {
        return await this.request('/auth/updatedetails', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async updatePassword(passwordData) {
        return await this.request('/auth/updatepassword', {
            method: 'PUT',
            body: JSON.stringify(passwordData)
        });
    }

    logout() {
        this.clearAuth();
        window.location.href = '/client/pages/login.html';
    }

    // Cart APIs
    async getCarts(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        return await this.request(`/carts${queryString ? '?' + queryString : ''}`);
    }

    async getCart(id) {
        return await this.request(`/carts/${id}`);
    }

    async createCart(cartData) {
        return await this.request('/carts', {
            method: 'POST',
            body: JSON.stringify(cartData)
        });
    }

    async joinCart(cartId) {
        return await this.request(`/carts/${cartId}/join`, {
            method: 'POST'
        });
    }

    async leaveCart(cartId) {
        return await this.request(`/carts/${cartId}/leave`, {
            method: 'POST'
        });
    }

    async getMyCarts() {
        return await this.request('/carts/my/all');
    }

    async deleteCart(cartId) {
        return await this.request(`/carts/${cartId}`, {
            method: 'DELETE'
        });
    }

    // Payment APIs
    async createPaymentOrder(cartId) {
        return await this.request('/payments/create-order', {
            method: 'POST',
            body: JSON.stringify({ cartId })
        });
    }

    async verifyPayment(paymentData) {
        return await this.request('/payments/verify', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async getPaymentStatus(cartId) {
        return await this.request(`/payments/status/${cartId}`);
    }

    async getMyOrders() {
        return await this.request('/payments/orders');
    }

    // Message APIs
    async getMessages(cartId, limit = 50, page = 1) {
        return await this.request(`/messages/${cartId}?limit=${limit}&page=${page}`);
    }

    async sendMessage(cartId, content, messageType = 'text') {
        return await this.request('/messages', {
            method: 'POST',
            body: JSON.stringify({ cartId, content, messageType })
        });
    }

    // Review APIs
    async createReview(reviewData) {
        return await this.request('/reviews', {
            method: 'POST',
            body: JSON.stringify(reviewData)
        });
    }

    async getUserReviews(userId) {
        return await this.request(`/reviews/user/${userId}`);
    }

    async getMyReviews() {
        return await this.request('/reviews/my');
    }

    async getPendingReviews() {
        return await this.request('/reviews/pending');
    }
}

// Export instance
const api = new APIClient();

// Check authentication
function requireAuth() {
    if (!api.getToken()) {
        window.location.href = '/client/pages/login.html';
        return false;
    }
    return true;
}

// Get user location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    coordinates: [position.coords.longitude, position.coords.latitude],
                    accuracy: position.coords.accuracy
                });
            },
            error => reject(error)
        );
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
