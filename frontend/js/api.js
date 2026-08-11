const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? window.location.origin
  : 'https://epl3-backend.onrender.com';

async function apiRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const headers = {};
  const token = localStorage.getItem('epl3_admin_token');
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (data && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const options = {
    method,
    headers
  };

  if (data) {
    options.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'API Request failed');
    }
    
    return result;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    showToast(err.message || 'Network request failed', 'error');
    throw err;
  }
}

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1.1rem;margin-left:10px;">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
