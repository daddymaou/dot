/* =========================================
   Dot — Client-side application logic
   ========================================= */

const API = "/api";

function getToken() {
  return localStorage.getItem("dot_token");
}

function setToken(token) {
  localStorage.setItem("dot_token", token);
}

function clearToken() {
  localStorage.removeItem("dot_token");
}

// ─── Loading Overlay ──────────────────────
let loadingStack = 0;

function showLoading() {
  loadingStack++;
  let overlay = document.getElementById('loadingOverlay');
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
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }
}

// ─── Toast Notifications ──────────────────
function showToast(msg, type) {
  if (!type) type = 'success';
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
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
  var div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ─── API Fetch with loading ───────────────
async function apiFetch(path, options) {
  options = options || {};
  var token = getToken();
  var headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = "Bearer " + token;

  showLoading();
  try {
    var res = await fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined
    });

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

/* ========== LANDING PAGE: MODALS ========== */
(function() {
  var loginModal = document.getElementById("loginModal");
  var registerModal = document.getElementById("registerModal");
  if (!loginModal && !registerModal) return;

  document.querySelectorAll("[data-open-login]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (registerModal) registerModal.classList.remove("active");
      loginModal.classList.add("active");
    });
  });
  document.querySelectorAll("[data-open-register]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      loginModal.classList.remove("active");
      if (registerModal) registerModal.classList.add("active");
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (loginModal) loginModal.classList.remove("active");
      if (registerModal) registerModal.classList.remove("active");
    });
  });
  [loginModal, registerModal].forEach(function(modal) {
    if (!modal) return;
    modal.addEventListener("click", function(e) {
      if (e.target === modal) modal.classList.remove("active");
    });
  });

  if (getToken()) {
    apiFetch("/auth/me").then(function() {
      var goDash = document.getElementById("navDashboardLink");
      if (goDash) goDash.classList.remove("hidden");
    }).catch(function() { clearToken(); });
  }

  var loginForm = document.getElementById("loginForm");
  loginForm && loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = loginForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
      var identifier = document.getElementById("loginIdentifier").value.trim();
      var password = document.getElementById("loginPassword").value;
      var data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier, password: password })
      });
      setToken(data.token);
      showToast('Logged in successfully', 'success');
      setTimeout(function() { window.location.href = "/dashboard"; }, 400);
    } catch (err) {
      // already toasted by apiFetch
    } finally {
      setButtonLoading(btn, false);
    }
  });

  var registerForm = document.getElementById("registerForm");
  registerForm && registerForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = registerForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
      var username = document.getElementById("registerUsername").value.trim();
      var email = document.getElementById("registerEmail").value.trim();
      var password = document.getElementById("registerPassword").value;
      var data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: username, email: email, password: password })
      });
      setToken(data.token);
      showToast('Account created!', 'success');
      setTimeout(function() { window.location.href = "/dashboard"; }, 400);
    } catch (err) {
      // already toasted by apiFetch
    } finally {
      setButtonLoading(btn, false);
    }
  });
})();

/* ========== DASHBOARD ========== */
(function() {
  var dashWrap = document.getElementById("dashWrap");
  if (!dashWrap) return;

  var currentUser = null;
  var MAX_PORTFOLIO = 6;

  async function boot() {
    if (!getToken()) {
      window.location.href = "/";
      return;
    }
    try {
      var data = await apiFetch("/auth/me");
      currentUser = data.user;
      renderProfileHeader();
      await Promise.all([loadStats(), loadLinks(), loadPortfolio(), loadProfileForm()]);
    } catch (err) {
      clearToken();
      window.location.href = "/";
    }
  }

  function renderProfileHeader() {
    var el = document.getElementById("dashUsername");
    if (el) el.textContent = "@" + currentUser.username;
    var urlInput = document.getElementById("publicUrlInput");
    if (urlInput) urlInput.value = window.location.origin + "/" + currentUser.username;
    var avatarPreview = document.getElementById("avatarPreview");
    if (avatarPreview) {
      if (currentUser.avatarUrl) {
        avatarPreview.innerHTML = '<img src="' + currentUser.avatarUrl + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">';
      } else {
        avatarPreview.textContent = currentUser.username[0].toUpperCase();
      }
    }
  }

  // Nav switching
  document.querySelectorAll(".dash-nav a[data-section]").forEach(function(link) {
    link.addEventListener("click", function(e) {
      e.preventDefault();
      document.querySelectorAll(".dash-nav a").forEach(function(a) { a.classList.remove("active"); });
      link.classList.add("active");
      document.querySelectorAll(".dash-section").forEach(function(s) { s.classList.remove("active"); });
      document.getElementById(link.dataset.section).classList.add("active");
    });
  });

  // Stats
  async function loadStats() {
    try {
      var linksData = await apiFetch("/links");
      var portfolioData = await apiFetch("/portfolio");
      document.getElementById("statLinks").textContent = linksData.links.length;
      document.getElementById("statPortfolio").textContent = portfolioData.items.length;
    } catch (err) {
      console.error(err);
    }
  }

  // Links
  async function loadLinks() {
    var list = document.getElementById("linksList");
    if (!list) return;
    try {
      var result = await apiFetch("/links");
      var links = result.links;
      if (!links.length) {
        list.innerHTML = '<div class="empty-state"><strong>No links yet</strong><p>Add your first link to get started.</p></div>';
        return;
      }
      list.innerHTML = links.map(function(link) {
        return '<div class="card" data-id="' + link._id + '" draggable="true">' +
          '<span class="card-drag">⠿</span>' +
          '<div class="card-body">' +
            '<div class="card-title">' + escapeHtml(link.icon) + ' ' + escapeHtml(link.title) + '</div>' +
            '<div class="card-sub">' + escapeHtml(link.url) + '</div>' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="toggle ' + (link.active ? 'on' : '') + '" data-toggle-link="' + link._id + '"><div class="knob"></div></div>' +
            '<button class="btn btn-sm btn-ghost" data-edit-link="' + link._id + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger" data-delete-link="' + link._id + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join("");
      attachLinkHandlers(links);
      enableDragReorder(list, "/links/reorder");
    } catch (err) {
      console.error(err);
    }
  }

  function attachLinkHandlers(links) {
    document.querySelectorAll("[data-toggle-link]").forEach(function(el) {
      el.addEventListener("click", async function() {
        var id = el.dataset.toggleLink;
        var link = links.find(function(l) { return l._id === id; });
        try {
          await apiFetch("/links/" + id, { method: "PUT", body: JSON.stringify({ active: !link.active }) });
          showToast(link.active ? 'Link hidden' : 'Link shown', 'success');
          loadLinks();
        } catch (err) {}
      });
    });
    document.querySelectorAll("[data-delete-link]").forEach(function(el) {
      el.addEventListener("click", async function() {
        var confirmed = await showConfirm('Delete this link?', 'Delete', true);
        if (!confirmed) return;
        try {
          await apiFetch("/links/" + el.dataset.deleteLink, { method: "DELETE" });
          showToast('Link deleted', 'success');
          loadLinks();
          loadStats();
        } catch (err) {}
      });
    });
    document.querySelectorAll("[data-edit-link]").forEach(function(el) {
      el.addEventListener("click", function() {
        var link = links.find(function(l) { return l._id === el.dataset.editLink; });
        openLinkForm(link);
      });
    });
  }

  function openLinkForm(link) {
    document.getElementById("linkFormTitle").textContent = link ? "Edit link" : "Add link";
    document.getElementById("linkFormId").value = link ? link._id : "";
    document.getElementById("linkFormTitleInput").value = link ? link.title : "";
    document.getElementById("linkFormUrl").value = link ? link.url : "";
    document.getElementById("linkFormIcon").value = link ? (link.icon || "🔗") : "🔗";
    document.getElementById("linkFormModal").classList.add("active");
  }

  var addLinkBtn = document.getElementById("addLinkBtn");
  addLinkBtn && addLinkBtn.addEventListener("click", function() { openLinkForm(); });

  var linkForm = document.getElementById("linkForm");
  linkForm && linkForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = linkForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    var id = document.getElementById("linkFormId").value;
    var title = document.getElementById("linkFormTitleInput").value.trim();
    var url = document.getElementById("linkFormUrl").value.trim();
    var icon = document.getElementById("linkFormIcon").value.trim() || "🔗";
    try {
      if (id) {
        await apiFetch("/links/" + id, { method: "PUT", body: JSON.stringify({ title: title, url: url, icon: icon }) });
      } else {
        await apiFetch("/links", { method: "POST", body: JSON.stringify({ title: title, url: url, icon: icon }) });
      }
      document.getElementById("linkFormModal").classList.remove("active");
      showToast(id ? 'Link updated' : 'Link added', 'success');
      loadLinks();
      loadStats();
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  // Portfolio
  async function loadPortfolio() {
    var grid = document.getElementById("portfolioList");
    if (!grid) return;
    try {
      var result = await apiFetch("/portfolio");
      var items = result.items;
      var addBtn = document.getElementById("addPortfolioBtn");
      if (addBtn) addBtn.disabled = items.length >= MAX_PORTFOLIO;
      var counter = document.getElementById("portfolioCounter");
      if (counter) counter.textContent = items.length + " / " + MAX_PORTFOLIO;

      if (!items.length) {
        grid.innerHTML = '<div class="empty-state"><strong>No portfolio items yet</strong><p>Add up to ' + MAX_PORTFOLIO + ' images to showcase your work.</p></div>';
        return;
      }
      grid.innerHTML = items.map(function(item) {
        return '<div class="card" data-id="' + item._id + '" draggable="true">' +
          '<span class="card-drag">⠿</span>' +
          (item.imageUrl ? '<img class="card-thumb" src="' + item.imageUrl + '" alt="">' : '<div class="card-thumb"></div>') +
          '<div class="card-body">' +
            '<div class="card-title">' + (escapeHtml(item.caption) || "(no caption)") + '</div>' +
            '<div class="card-sub">' + (escapeHtml(item.url) || "no link") + '</div>' +
          '</div>' +
          '<div class="card-actions">' +
            '<div class="toggle ' + (item.active ? 'on' : '') + '" data-toggle-item="' + item._id + '"><div class="knob"></div></div>' +
            '<button class="btn btn-sm btn-ghost" data-edit-item="' + item._id + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger" data-delete-item="' + item._id + '">Delete</button>' +
          '</div>' +
        '</div>';
      }).join("");
      attachPortfolioHandlers(items);
      enableDragReorder(grid, "/portfolio/reorder");
    } catch (err) {
      console.error(err);
    }
  }

  function attachPortfolioHandlers(items) {
    document.querySelectorAll("[data-toggle-item]").forEach(function(el) {
      el.addEventListener("click", async function() {
        var id = el.dataset.toggleItem;
        var item = items.find(function(i) { return i._id === id; });
        var fd = new FormData();
        fd.append("active", !item.active);
        try {
          await apiFetch("/portfolio/" + id, { method: "PUT", body: fd });
          showToast(item.active ? 'Item hidden' : 'Item shown', 'success');
          loadPortfolio();
        } catch (err) {}
      });
    });
    document.querySelectorAll("[data-delete-item]").forEach(function(el) {
      el.addEventListener("click", async function() {
        var confirmed = await showConfirm('Delete this portfolio item?', 'Delete', true);
        if (!confirmed) return;
        try {
          await apiFetch("/portfolio/" + el.dataset.deleteItem, { method: "DELETE" });
          showToast('Portfolio item deleted', 'success');
          loadPortfolio();
          loadStats();
        } catch (err) {}
      });
    });
    document.querySelectorAll("[data-edit-item]").forEach(function(el) {
      el.addEventListener("click", function() {
        var item = items.find(function(i) { return i._id === el.dataset.editItem; });
        openPortfolioForm(item);
      });
    });
  }

  function openPortfolioForm(item) {
    document.getElementById("portfolioFormTitle").textContent = item ? "Edit item" : "Add portfolio item";
    document.getElementById("portfolioFormId").value = item ? item._id : "";
    document.getElementById("portfolioFormCaption").value = item ? (item.caption || "") : "";
    document.getElementById("portfolioFormUrl").value = item ? (item.url || "") : "";
    document.getElementById("portfolioFormImage").value = "";
    document.getElementById("portfolioFormModal").classList.add("active");
  }

  var addPortfolioBtn = document.getElementById("addPortfolioBtn");
  addPortfolioBtn && addPortfolioBtn.addEventListener("click", function() { openPortfolioForm(); });

  var portfolioForm = document.getElementById("portfolioForm");
  portfolioForm && portfolioForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = portfolioForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    var id = document.getElementById("portfolioFormId").value;
    var caption = document.getElementById("portfolioFormCaption").value.trim();
    var url = document.getElementById("portfolioFormUrl").value.trim();
    var imageFile = document.getElementById("portfolioFormImage").files[0];

    var fd = new FormData();
    fd.append("caption", caption);
    fd.append("url", url);
    if (imageFile) fd.append("image", imageFile);

    try {
      if (id) {
        await apiFetch("/portfolio/" + id, { method: "PUT", body: fd });
      } else {
        await apiFetch("/portfolio", { method: "POST", body: fd });
      }
      document.getElementById("portfolioFormModal").classList.remove("active");
      showToast(id ? 'Portfolio item updated' : 'Portfolio item added', 'success');
      loadPortfolio();
      loadStats();
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  // Drag reorder
  function enableDragReorder(container, endpoint) {
    var dragEl = null;
    container.querySelectorAll(".card").forEach(function(card) {
      card.addEventListener("dragstart", function() {
        dragEl = card;
        card.style.opacity = "0.4";
      });
      card.addEventListener("dragend", async function() {
        card.style.opacity = "1";
        var order = Array.from(container.querySelectorAll(".card")).map(function(c) { return c.dataset.id; });
        try {
          await apiFetch(endpoint, { method: "PUT", body: JSON.stringify({ order: order }) });
        } catch (err) {
          console.error(err);
        }
      });
      card.addEventListener("dragover", function(e) {
        e.preventDefault();
        var afterEl = getDragAfterElement(container, e.clientY);
        if (!dragEl) return;
        if (afterEl == null) {
          container.appendChild(dragEl);
        } else {
          container.insertBefore(dragEl, afterEl);
        }
      });
    });
  }

  function getDragAfterElement(container, y) {
    var els = Array.from(container.querySelectorAll(".card:not([style*='opacity: 0.4'])"));
    return els.reduce(function(closest, child) {
      var box = child.getBoundingClientRect();
      var offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Profile form
  async function loadProfileForm() {
    if (!currentUser) return;
    document.getElementById("profileDisplayName").value = currentUser.displayName || "";
    document.getElementById("profileBio").value = currentUser.bio || "";
    document.getElementById("profileLocation").value = currentUser.location || "";
    document.getElementById("socialTwitter").value = (currentUser.social && currentUser.social.twitter) || "";
    document.getElementById("socialGithub").value = (currentUser.social && currentUser.social.github) || "";
    document.getElementById("socialLinkedin").value = (currentUser.social && currentUser.social.linkedin) || "";
    document.getElementById("socialYoutube").value = (currentUser.social && currentUser.social.youtube) || "";
    document.getElementById("socialInstagram").value = (currentUser.social && currentUser.social.instagram) || "";
  }

  var profileForm = document.getElementById("profileForm");
  profileForm && profileForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = profileForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
      var data = await apiFetch("/user/profile", {
        method: "PUT",
        body: JSON.stringify({
          displayName: document.getElementById("profileDisplayName").value.trim(),
          bio: document.getElementById("profileBio").value.trim(),
          location: document.getElementById("profileLocation").value.trim()
        })
      });
      currentUser = data.user;
      showToast('Profile updated', 'success');
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  var socialForm = document.getElementById("socialForm");
  socialForm && socialForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = socialForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    try {
      var data = await apiFetch("/user/social", {
        method: "PUT",
        body: JSON.stringify({
          twitter: document.getElementById("socialTwitter").value.trim(),
          github: document.getElementById("socialGithub").value.trim(),
          linkedin: document.getElementById("socialLinkedin").value.trim(),
          youtube: document.getElementById("socialYoutube").value.trim(),
          instagram: document.getElementById("socialInstagram").value.trim()
        })
      });
      currentUser = data.user;
      showToast('Social links updated', 'success');
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  var avatarInput = document.getElementById("avatarInput");
  avatarInput && avatarInput.addEventListener("change", async function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var fd = new FormData();
    fd.append("avatar", file);
    try {
      var data = await apiFetch("/user/avatar", { method: "POST", body: fd });
      currentUser.avatarUrl = data.avatarUrl;
      renderProfileHeader();
      showToast('Avatar updated', 'success');
    } catch (err) {}
  });

  var passwordForm = document.getElementById("passwordForm");
  passwordForm && passwordForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var btn = passwordForm.querySelector('button[type="submit"]');
    setButtonLoading(btn, true);
    var currentPassword = document.getElementById("currentPassword").value;
    var newPassword = document.getElementById("newPassword").value;
    try {
      await apiFetch("/user/password", { method: "PUT", body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword }) });
      showToast('Password updated', 'success');
      passwordForm.reset();
    } catch (err) {} finally {
      setButtonLoading(btn, false);
    }
  });

  var copyUrlBtn = document.getElementById("copyUrlBtn");
  copyUrlBtn && copyUrlBtn.addEventListener("click", function() {
    var input = document.getElementById("publicUrlInput");
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('URL copied to clipboard', 'success');
  });

  var previewBtn = document.getElementById("previewBtn");
  previewBtn && previewBtn.addEventListener("click", function() {
    window.open("/" + currentUser.username, "_blank");
  });

  var logoutBtn = document.getElementById("logoutBtn");
  logoutBtn && logoutBtn.addEventListener("click", async function() {
    var confirmed = await showConfirm('Are you sure you want to log out?', 'Log out');
    if (!confirmed) return;
    clearToken();
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch (err) {}
    window.location.href = "/";
  });

  // Close modals
  document.querySelectorAll("[data-close-modal]").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      var modal = e.target.closest(".modal-overlay");
      if (modal) modal.classList.remove("active");
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(function(overlay) {
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  });

  boot();
})();