/* ADMIN AUTHENTICATION UTILITY */

function getAdminToken() {
  return localStorage.getItem('epl3_admin_token');
}

function getAdminUser() {
  const user = localStorage.getItem('epl3_admin_user');
  return user ? JSON.parse(user) : null;
}

function checkAdminAuth() {
  const token = getAdminToken();
  if (!token) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

function logoutAdmin() {
  localStorage.removeItem('epl3_admin_token');
  localStorage.removeItem('epl3_admin_user');
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = '/admin/login.html';
  }, 500);
}
