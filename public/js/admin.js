// =========================================
// Dot Admin — Client-side JS
// =========================================

var adminToken = localStorage.getItem('adminToken');
var currentPage = 1;
var USERS_PER_PAGE = 15;
var chartRegistrations = null;
var chartBreakdown = null;

// ─── Loading Overlay ──────────────────────
var loadingStack = 0;

function showLoading() {
  loadingStack++;
  var overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"><span class="spinner-box"></span><span class="spinner-box"></span><span class="spinner-box"></span></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
}

function hideLoading() {
  loadingStack = Math.max(0, loadingStack - 1);
  if (loadingStack === 0) {
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

// ─── Toast Notifications ──────────────────
function showToast(msg, type) {
  if (!type) type = 'success';
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = msg || 'Something went wrong';
  container.appendChild(toast);
  requestAnimationFrame(function() { toast.classList.add('show'); });
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}

// ─── Confirm Modal ────────────────────────
function showConfirm(msg, confirmLabel, danger) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    var okClass = danger ? 'btn-danger' : 'btn-primary';
    overlay.innerHTML =
      '<div class="confirm-box">' +
        '<p>' + msg + '</p>' +
        '<div class="flex gap-8">' +
          '<button class="btn btn-sm cancel-btn">Cancel</button>' +
          '<button class="btn btn-sm ' + okClass + ' ok-btn">' + (confirmLabel || 'Confirm') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var resolved = false;
    function cleanup(result) {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector('.cancel-btn').addEventListener('click', function() { cleanup(false); });
    overlay.querySelector('.ok-btn').addEventListener('click', function() { cleanup(true); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) cleanup(false); });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Button loading state ─────────────────
function setButtonLoading(btn, loading) {
  if (loading) {
    btn._originalText = btn.textContent;
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn._originalText) btn.textContent = btn._originalText;
  }
}

// ─── API Fetch with loading ───────────────
async function apiFetch(url, options) {
  options = options || {};
  var headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (adminToken) headers["Authorization"] = "Bearer " + adminToken;

  showLoading();
  try {
    var res = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined
    });

    if (res.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }

    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text || res.statusText };
    }

    if (!res.ok) {
      throw new Error(data.message || 'Request failed (' + res.status + ')');
    }
    return data;
  } catch (err) {
    showToast(err.message || 'Network error', 'error');
    throw err;
  } finally {
    hideLoading();
  }
}

// ─── Login Page ───────────────────────────
if (document.getElementById('adminLoginForm')) {
  document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = e.target.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    var identifier = document.getElementById('identifier').value.trim();
    var password = document.getElementById('password').value;
    try {
      var res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier, password: password })
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      localStorage.setItem('adminToken', data.token);
      showToast('Welcome back, admin', 'success');
      setTimeout(function() { window.location.href = '/admin'; }, 400);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

// ─── Dashboard Page ───────────────────────
if (document.getElementById('adminWrap')) {

  if (!adminToken) {
    window.location.href = '/admin/login';
  }

  var greeting = document.getElementById('adminGreeting');
  if (greeting) {
    var hour = new Date().getHours();
    greeting.textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }

  // ─── Navigation ─────────────────────────
  var sections = document.querySelectorAll('.dash-section');
  var navLinks = document.querySelectorAll('.dash-nav a');
  var sectionTitle = document.getElementById('adminSectionTitle');
  var titles = {
    'section-overview': 'Overview',
    'section-users': 'Users',
    'section-profile': 'My Profile',
    'section-logs': 'Logs',
    'section-cleanup': 'Cleanup'
  };

  navLinks.forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var target = link.getAttribute('data-section');
      navLinks.forEach(function(l) { l.classList.remove('active'); });
      link.classList.add('active');
      sections.forEach(function(s) { s.classList.remove('active'); });
      document.getElementById(target).classList.add('active');
      if (sectionTitle) sectionTitle.textContent = titles[target] || '';
      if (target === 'section-overview') loadOverview();
      if (target === 'section-users') loadUsers();
      if (target === 'section-profile') loadAdminProfile();
      if (target === 'section-logs') loadLogs();
      if (target === 'section-cleanup') loadCleanupStats();
    });
  });

  document.getElementById('adminLogoutBtn').addEventListener('click', async function() {
    var confirmed = await showConfirm('Are you sure you want to log out?', 'Log out');
    if (!confirmed) return;
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  });

  // ─── Overview ───────────────────────────
  async function loadOverview() {
    try {
      var data = await apiFetch('/api/admin/stats');

      document.getElementById('statTotalUsers').textContent = data.totalUsers != null ? data.totalUsers : '—';
      document.getElementById('statActiveUsers').textContent = data.activeUsers != null ? data.activeUsers : '—';
      document.getElementById('statInactiveUsers').textContent = data.inactiveUsers != null ? data.inactiveUsers : '—';
      document.getElementById('statAdminUsers').textContent = data.adminUsers != null ? data.adminUsers : '—';

      // Registration chart
      if (chartRegistrations) chartRegistrations.destroy();
      var ctx1 = document.getElementById('chartRegistrations');
      var chartRegEmpty = document.getElementById('chartRegEmpty');
      var days = data.registrationsLast7Days || [];
      if (ctx1) {
        if (days.length === 0) {
          ctx1.style.display = 'none';
          if (chartRegEmpty) chartRegEmpty.style.display = 'flex';
        } else {
          ctx1.style.display = 'block';
          if (chartRegEmpty) chartRegEmpty.style.display = 'none';
          chartRegistrations = new Chart(ctx1.getContext('2d'), {
            type: 'bar',
            data: {
              labels: days.map(function(d) { return d._id || d.date || ''; }),
              datasets: [{
                label: 'New Users',
                data: days.map(function(d) { return d.count || 0; }),
                backgroundColor: '#000000',
                borderColor: '#000000',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
          });
        }
      }

      // Breakdown doughnut
      if (chartBreakdown) chartBreakdown.destroy();
      var ctx2 = document.getElementById('chartBreakdown');
      var chartBreakEmpty = document.getElementById('chartBreakEmpty');
      var hasData = (data.activeUsers || 0) + (data.inactiveUsers || 0) + (data.adminUsers || 0) > 0;
      if (ctx2) {
        if (!hasData) {
          ctx2.style.display = 'none';
          if (chartBreakEmpty) chartBreakEmpty.style.display = 'flex';
        } else {
          ctx2.style.display = 'block';
          if (chartBreakEmpty) chartBreakEmpty.style.display = 'none';
          chartBreakdown = new Chart(ctx2.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Active', 'Inactive', 'Admins'],
              datasets: [{
                data: [data.activeUsers || 0, data.inactiveUsers || 0, data.adminUsers || 0],
                backgroundColor: ['#000000', '#999999', '#555555'],
                borderColor: '#ffffff',
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'bottom' } }
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    }
  }

  // ─── Users ──────────────────────────────
  async function loadUsers(page) {
    if (!page) page = 1;
    currentPage = page;
    var searchInput = document.getElementById('userSearchInput');
    var search = searchInput ? searchInput.value.trim() : '';
    try {
      var params = '?page=' + page + '&limit=' + USERS_PER_PAGE;
      if (search) params += '&q=' + encodeURIComponent(search);
      var data = await apiFetch('/api/admin/users' + params);
      renderUsersTable(data.users || []);
      var total = data.total || 0;
      var totalPages = Math.ceil(total / USERS_PER_PAGE) || 1;
      document.getElementById('usersPaginationInfo').textContent =
        'Page ' + page + ' of ' + totalPages + ' (' + total + ' users)';
      document.getElementById('usersPrevBtn').disabled = page <= 1;
      document.getElementById('usersNextBtn').disabled = page >= totalPages;
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  function renderUsersTable(users) {
    var tbody = document.getElementById('usersTableBody');
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(function(u) {
      return '<tr>' +
        '<td><strong>@' + escapeHtml(u.username || '') + '</strong></td>' +
        '<td>' + escapeHtml(u.email || '') + '</td>' +
        '<td><span class="badge ' + (u.isAdmin ? 'badge-admin' : '') + '">' + escapeHtml(u.isAdmin ? 'admin' : 'user') + '</span></td>' +
        '<td><span class="badge ' + (u.isActive !== false ? 'badge-active' : 'badge-inactive') + '">' + (u.isActive !== false ? 'Active' : 'Inactive') + '</span></td>' +
        '<td>' + (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—') + '</td>' +
        '<td><div class="flex gap-8">' +
          (u.isActive !== false
            ? '<button class="btn btn-xs btn-ghost deactivate-user" data-id="' + u.id + '">Deactivate</button>'
            : '<button class="btn btn-xs btn-ghost activate-user" data-id="' + u.id + '">Activate</button>') +
          '<button class="btn btn-xs btn-danger delete-user" data-id="' + u.id + '" data-username="' + escapeHtml(u.username) + '">Delete</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.activate-user').forEach(function(btn) {
      btn.addEventListener('click', function() { toggleUser(btn.dataset.id, 'activate'); });
    });
    tbody.querySelectorAll('.deactivate-user').forEach(function(btn) {
      btn.addEventListener('click', function() { toggleUser(btn.dataset.id, 'deactivate'); });
    });
    tbody.querySelectorAll('.delete-user').forEach(function(btn) {
      btn.addEventListener('click', function() { deleteUser(btn.dataset.id, btn.dataset.username); });
    });
  }

  async function toggleUser(id, action) {
    try {
      var endpoint = action === 'activate' ? 'activate' : 'deactivate';
      await apiFetch('/api/admin/users/' + id + '/' + endpoint, { method: 'PUT' });
      showToast('User ' + action + 'd', 'success');
      loadUsers(currentPage);
    } catch (err) {}
  }

  async function deleteUser(id, username) {
    var confirmed = await showConfirm('Permanently delete user <strong>@' + escapeHtml(username) + '</strong>? This cannot be undone.', 'Delete', true);
    if (!confirmed) return;
    try {
      await apiFetch('/api/admin/users/' + id, { method: 'DELETE' });
      showToast('User @' + escapeHtml(username) + ' deleted', 'success');
      loadUsers(currentPage);
    } catch (err) {}
  }

  var userSearchBtn = document.getElementById('userSearchBtn');
  userSearchBtn && userSearchBtn.addEventListener('click', function() { loadUsers(1); });
  var userSearchInput = document.getElementById('userSearchInput');
  userSearchInput && userSearchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') loadUsers(1);
  });
  var usersPrevBtn = document.getElementById('usersPrevBtn');
  usersPrevBtn && usersPrevBtn.addEventListener('click', function() { loadUsers(currentPage - 1); });
  var usersNextBtn = document.getElementById('usersNextBtn');
  usersNextBtn && usersNextBtn.addEventListener('click', function() { loadUsers(currentPage + 1); });

  var userExportBtn = document.getElementById('userExportBtn');
  userExportBtn && userExportBtn.addEventListener('click', async function() {
    showLoading();
    try {
      var res = await fetch('/api/admin/users/export', {
        headers: { 'Authorization': 'Bearer ' + adminToken }
      });
      var blob = await res.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'users_export.csv';
      a.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported', 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    } finally {
      hideLoading();
    }
  });

  // ─── Admin Profile ──────────────────────
  async function loadAdminProfile() {
    try {
      var data = await apiFetch('/api/admin/profile');
      document.getElementById('adminUsername').value = data.username || '';
      document.getElementById('adminEmail').value = data.email || '';
    } catch (err) {}
  }

  var adminProfileForm = document.getElementById('adminProfileForm');
  adminProfileForm && adminProfileForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = adminProfileForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    var email = document.getElementById('adminEmail').value.trim();
    try {
      await apiFetch('/api/admin/profile', { method: 'PUT', body: JSON.stringify({ email: email }) });
      showToast('Profile updated', 'success');
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  var adminPasswordForm = document.getElementById('adminPasswordForm');
  adminPasswordForm && adminPasswordForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    var btn = adminPasswordForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    var currentPassword = document.getElementById('adminCurrentPassword').value;
    var newPassword = document.getElementById('adminNewPassword').value;
    try {
      await apiFetch('/api/admin/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword })
      });
      showToast('Password updated', 'success');
      adminPasswordForm.reset();
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  // ─── Logs ───────────────────────────────
  async function loadLogs() {
    try {
      var data = await apiFetch('/api/admin/logs');
      var logs = data.logs || [];
      var tbody = document.getElementById('logsTableBody');
      if (!logs.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="table-empty">No logs recorded yet.</td></tr>';
        return;
      }
      tbody.innerHTML = logs.map(function(l) {
        return '<tr>' +
          '<td>' + (l.timestamp ? new Date(l.timestamp).toLocaleString() : '—') + '</td>' +
          '<td>' + escapeHtml(l.action || '') + '</td>' +
          '<td>' + escapeHtml(l.details || '') + '</td>' +
        '</tr>';
      }).join('');
    } catch (err) {}
  }

  // ─── Cleanup ────────────────────────────
  async function loadCleanupStats() {
    try {
      var data = await apiFetch('/api/admin/stats');
      document.getElementById('statInactiveCount').textContent = data.inactiveUsers != null ? data.inactiveUsers : '—';
    } catch (err) {}
  }

  var cleanupBtn = document.getElementById('cleanupBtn');
  cleanupBtn && cleanupBtn.addEventListener('click', async function() {
    var confirmed = await showConfirm('Permanently delete <strong>all inactive accounts</strong>? This cannot be undone.', 'Delete All Inactive', true);
    if (!confirmed) return;
    try {
      var data = await apiFetch('/api/admin/cleanup', { method: 'POST' });
      showToast('Deleted ' + (data.deletedCount || 0) + ' inactive accounts', 'success');
      loadCleanupStats();
    } catch (err) {}
  });

  loadOverview();
}