const API_BASE = '';
let allApps = [];
let currentAppId = null;
let teachersList = [];

// Load apps, teachers, and segments on page load
document.addEventListener('DOMContentLoaded', () => {
  loadApps();
  loadTeachers();
  loadSegments();
});

// Load teachers from Notion
async function loadTeachers() {
  try {
    const response = await fetch(`${API_BASE}/api/teachers`);
    teachersList = await response.json();
    populateTeachersList();
  } catch (error) {
    console.error('Error loading teachers:', error);
    // If Notion fails, the user can still type their name manually
  }
}

// Populate teachers datalist
function populateTeachersList() {
  const datalist = document.getElementById('teachersList');
  datalist.innerHTML = teachersList.map(teacher =>
    `<option value="${escapeHtml(teacher)}">`
  ).join('');
}

// Load all apps
async function loadApps() {
  try {
    const response = await fetch(`${API_BASE}/api/apps`);
    allApps = await response.json();
    displayApps(allApps);
    populateTeacherFilter();
  } catch (error) {
    console.error('Error loading apps:', error);
    showMessage('Error loading apps. Please refresh the page.', 'error');
  }
}

// Populate teacher filter dropdown
function populateTeacherFilter() {
  const teacherFilter = document.getElementById('teacherFilter');

  // Get unique teacher names from all apps
  const uniqueTeachers = [...new Set(allApps.map(app => app.teacher_name))].sort();

  // Keep the "All Teachers" option and add teacher names
  teacherFilter.innerHTML = '<option value="all">All Teachers</option>' +
    uniqueTeachers.map(teacher =>
      `<option value="${escapeHtml(teacher)}">${escapeHtml(teacher)}</option>`
    ).join('');
}

// Display apps in grid
function displayApps(apps) {
  const grid = document.getElementById('appsGrid');
  const emptyState = document.getElementById('emptyState');

  if (apps.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  grid.style.display = 'grid';
  emptyState.style.display = 'none';

  grid.innerHTML = apps.map(app => {
    const levels = app.student_levels.split(',');

    return `
      <div class="app-card" onclick="openAppDetail(${app.id})">
        ${app.image_url
          ? `<img src="${app.image_url}" alt="${app.title}" class="app-image">`
          : `<div class="app-image"></div>`
        }
        <div class="app-content">
          <div class="app-header">
            <h3 class="app-title">${escapeHtml(app.title)}</h3>
            <p class="app-teacher">by ${escapeHtml(app.teacher_name)}</p>
          </div>
          <p class="app-description">${escapeHtml(app.description)}</p>
          <div class="app-meta">
            <span class="app-badge category">${escapeHtml(app.category)}</span>
            ${levels.map(level => `<span class="app-badge">${escapeHtml(level)}</span>`).join('')}
          </div>
          <div class="app-footer">
            <div class="app-rating">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF3B30" stroke="#FF3B30" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span class="rating-count">${app.rating_count} ${app.rating_count === 1 ? 'like' : 'likes'}</span>
            </div>
            <div class="app-comments">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              ${app.comment_count}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Track user's like state
let userHasLiked = false;
let currentUserName = '';

// Filter apps
function filterApps() {
  const category = document.getElementById('categoryFilter').value;
  const level = document.getElementById('levelFilter').value;
  const teacher = document.getElementById('teacherFilter').value;
  const search = document.getElementById('searchInput').value.toLowerCase();

  let filtered = allApps;

  if (category !== 'all') {
    filtered = filtered.filter(app => app.category === category);
  }

  if (level !== 'all') {
    filtered = filtered.filter(app => app.student_levels.includes(level));
  }

  if (teacher !== 'all') {
    filtered = filtered.filter(app => app.teacher_name === teacher);
  }

  if (search) {
    filtered = filtered.filter(app =>
      app.title.toLowerCase().includes(search) ||
      app.description.toLowerCase().includes(search) ||
      app.teacher_name.toLowerCase().includes(search)
    );
  }

  displayApps(filtered);
}

// Open upload modal
function openUploadModal() {
  const modal = document.getElementById('uploadModal');
  const form = document.getElementById('uploadForm');
  const modalTitle = document.getElementById('modalTitle');

  form.reset();
  document.getElementById('editAppId').value = '';
  document.getElementById('imagePreview').innerHTML = '';
  modalTitle.textContent = 'Upload Your App';
  document.getElementById('submitBtn').textContent = 'Upload App';

  modal.classList.add('active');
}

// Close upload modal
function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.classList.remove('active');
}

// Preview image
function previewImage(event) {
  const preview = document.getElementById('imagePreview');
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  }
}

// Handle form submit
async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData();
  const editAppId = document.getElementById('editAppId').value;

  formData.append('teacher_name', document.getElementById('teacherName').value);
  formData.append('title', document.getElementById('appTitle').value);
  formData.append('description', document.getElementById('appDescription').value);
  formData.append('category', document.getElementById('appCategory').value);
  formData.append('app_link', document.getElementById('appLink').value);

  // Add alternative link if provided
  const alternativeLink = document.getElementById('alternativeLink').value;
  if (alternativeLink) {
    formData.append('alternative_link', alternativeLink);
  }

  // Get selected student levels
  const levels = Array.from(document.querySelectorAll('input[name="studentLevel"]:checked'))
    .map(cb => cb.value);

  if (levels.length === 0) {
    alert('Please select at least one student level');
    return;
  }

  formData.append('student_levels', levels.join(','));

  // Handle image
  const imageFile = document.getElementById('appImage').files[0];
  if (imageFile) {
    formData.append('image', imageFile);
  } else if (editAppId) {
    // Preserve existing image when editing
    const existingApp = allApps.find(app => app.id == editAppId);
    if (existingApp && existingApp.image_url) {
      formData.append('existing_image', existingApp.image_url);
    }
  }

  try {
    const url = editAppId
      ? `${API_BASE}/api/apps/${editAppId}`
      : `${API_BASE}/api/apps`;

    const method = editAppId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      closeUploadModal();
      loadApps();
    } else {
      showMessage(data.error || 'Error submitting app', 'error');
    }
  } catch (error) {
    console.error('Error submitting app:', error);
    showMessage('Error submitting app. Please try again.', 'error');
  }
}

// Open app detail modal
async function openAppDetail(appId) {
  currentAppId = appId;
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('detailContent');
  const title = document.getElementById('detailTitle');

  try {
    // Load app details
    const appResponse = await fetch(`${API_BASE}/api/apps/${appId}`);
    const app = await appResponse.json();

    // Load comments
    const commentsResponse = await fetch(`${API_BASE}/api/apps/${appId}/comments`);
    const comments = await commentsResponse.json();

    title.textContent = app.title;

    const levels = app.student_levels.split(',');
    const rating = parseFloat(app.average_rating);

    content.innerHTML = `
      <div class="detail-header">
        ${app.image_url
          ? `<img src="${app.image_url}" alt="${app.title}" class="detail-image">`
          : `<div class="detail-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>`
        }
        <div class="detail-info">
          <p style="font-size: 16px; color: #718096; margin-bottom: 12px;">Created by <strong>${escapeHtml(app.teacher_name)}</strong></p>
          <div class="detail-meta">
            <span class="app-badge category">${escapeHtml(app.category)}</span>
            ${levels.map(level => `<span class="app-badge">${escapeHtml(level)}</span>`).join('')}
          </div>
          <p class="detail-description">${escapeHtml(app.description)}</p>
          <div class="detail-actions">
            <a href="${escapeHtml(app.app_link)}" target="_blank" class="btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open App
            </a>
            ${app.alternative_link ? `
            <a href="${escapeHtml(app.alternative_link)}" target="_blank" class="btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Alternative Link
            </a>
            ` : ''}
            <button class="btn-secondary btn-small" onclick="editApp(${app.id})">Edit</button>
            <button class="btn-danger btn-small" onclick="deleteApp(${app.id})">Delete</button>
          </div>
        </div>
      </div>

      <div class="rating-section">
        <h3>Like this App</h3>
        <div class="rating-input">
          <button class="like-button" id="likeButton" onclick="toggleLike()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span id="likeButtonText">Like</span>
          </button>
          <div style="margin-left: 16px;">
            <strong id="likeCount">${app.rating_count}</strong> ${app.rating_count === 1 ? 'person likes' : 'people like'} this app
          </div>
        </div>
      </div>

      <div class="comment-section">
        <h3>Comments (${comments.length})</h3>
        <div class="comment-form">
          <input type="text" id="commentName" list="teachersListDetail" placeholder="Your name" />
          <datalist id="teachersListDetail">
            ${teachersList.map(teacher => `<option value="${escapeHtml(teacher)}">`).join('')}
          </datalist>
          <textarea id="commentText" placeholder="Write a comment..." rows="3"></textarea>
          <button class="btn-primary" onclick="submitComment()">Post Comment</button>
        </div>
        <div class="comment-list">
          ${comments.length > 0
            ? comments.map(comment => `
              <div class="comment">
                <div class="comment-header">
                  <span class="comment-author">${escapeHtml(comment.teacher_name)}</span>
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="comment-date">${formatDate(comment.created_at)}</span>
                    <button class="btn-delete-comment" onclick="deleteComment(${comment.id})" title="Delete comment">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <p class="comment-text">${escapeHtml(comment.comment)}</p>
              </div>
            `).join('')
            : '<p style="color: #718096;">No comments yet. Be the first to comment!</p>'
          }
        </div>
      </div>
    `;

    modal.classList.add('active');

    // Check if current user has already liked this app
    if (currentUserName) {
      try {
        const likeCheckResponse = await fetch(`${API_BASE}/api/apps/${appId}/check-like/${encodeURIComponent(currentUserName)}`);
        const likeCheckData = await likeCheckResponse.json();

        const likeButton = document.getElementById('likeButton');
        const likeButtonText = document.getElementById('likeButtonText');
        const svg = likeButton.querySelector('svg');

        if (likeCheckData.liked) {
          svg.setAttribute('fill', '#FF3B30');
          likeButtonText.textContent = 'Unlike';
          likeButton.classList.add('liked');
          userHasLiked = true;
        } else {
          svg.setAttribute('fill', 'none');
          likeButtonText.textContent = 'Like';
          likeButton.classList.remove('liked');
          userHasLiked = false;
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    }
  } catch (error) {
    console.error('Error loading app details:', error);
    showMessage('Error loading app details', 'error');
  }
}

// Close detail modal
function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  modal.classList.remove('active');
  currentAppId = null;
}

// Edit app
function editApp(appId) {
  const app = allApps.find(a => a.id === appId);
  if (!app) return;

  closeDetailModal();

  document.getElementById('editAppId').value = app.id;
  document.getElementById('teacherName').value = app.teacher_name;
  document.getElementById('appTitle').value = app.title;
  document.getElementById('appDescription').value = app.description;
  document.getElementById('appCategory').value = app.category;
  document.getElementById('appLink').value = app.app_link;
  document.getElementById('alternativeLink').value = app.alternative_link || '';

  // Set student levels
  const levels = app.student_levels.split(',');
  document.querySelectorAll('input[name="studentLevel"]').forEach(cb => {
    cb.checked = levels.includes(cb.value);
  });

  // Show existing image
  if (app.image_url) {
    document.getElementById('imagePreview').innerHTML = `<img src="${app.image_url}" alt="Current image">`;
  }

  document.getElementById('modalTitle').textContent = 'Edit App';
  document.getElementById('submitBtn').textContent = 'Update App';
  document.getElementById('uploadModal').classList.add('active');
}

// Delete app
async function deleteApp(appId) {
  if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/apps/${appId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      closeDetailModal();
      loadApps();
    } else {
      showMessage(data.error || 'Error deleting app', 'error');
    }
  } catch (error) {
    console.error('Error deleting app:', error);
    showMessage('Error deleting app. Please try again.', 'error');
  }
}

// Toggle like on app
async function toggleLike() {
  if (!currentUserName) {
    const name = prompt('Enter your name to like this app:');
    if (!name) return;
    currentUserName = name;
  }

  try {
    const response = await fetch(`${API_BASE}/api/apps/${currentAppId}/rate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ teacher_name: currentUserName, rating: 5 })
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');

      // Toggle the button state based on server response
      const likeButton = document.getElementById('likeButton');
      const likeButtonText = document.getElementById('likeButtonText');
      const likeCountElement = document.getElementById('likeCount');
      const svg = likeButton.querySelector('svg');

      if (data.action === 'liked') {
        svg.setAttribute('fill', '#FF3B30');
        likeButtonText.textContent = 'Unlike';
        likeButton.classList.add('liked');
        const currentCount = parseInt(likeCountElement.textContent);
        likeCountElement.textContent = currentCount + 1;
        userHasLiked = true;
      } else {
        svg.setAttribute('fill', 'none');
        likeButtonText.textContent = 'Like';
        likeButton.classList.remove('liked');
        const currentCount = parseInt(likeCountElement.textContent);
        likeCountElement.textContent = currentCount - 1;
        userHasLiked = false;
      }

      // Reload apps to update the list
      loadApps();
    } else {
      showMessage(data.error || 'Error liking app', 'error');
    }
  } catch (error) {
    console.error('Error liking app:', error);
    showMessage('Error liking app. Please try again.', 'error');
  }
}

// Submit comment
async function submitComment() {
  const teacherName = document.getElementById('commentName').value.trim();
  const comment = document.getElementById('commentText').value.trim();

  if (!teacherName || !comment) {
    alert('Please enter your name and comment');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/apps/${currentAppId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ teacher_name: teacherName, comment })
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      document.getElementById('commentName').value = '';
      document.getElementById('commentText').value = '';
      // Reload the detail to show new comment
      openAppDetail(currentAppId);
    } else {
      showMessage(data.error || 'Error posting comment', 'error');
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    showMessage('Error posting comment. Please try again.', 'error');
  }
}

// Delete comment
async function deleteComment(commentId) {
  if (!confirm('Are you sure you want to delete this comment?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/comments/${commentId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      // Reload the detail to show updated comments
      openAppDetail(currentAppId);
    } else {
      showMessage(data.error || 'Error deleting comment', 'error');
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    showMessage('Error deleting comment. Please try again.', 'error');
  }
}

// Show success/error message
function showMessage(message, type = 'success') {
  const messageEl = document.createElement('div');
  messageEl.className = 'success-message';
  messageEl.style.background = type === 'success' ? '#48bb78' : '#f56565';
  messageEl.textContent = message;
  document.body.appendChild(messageEl);

  setTimeout(() => {
    messageEl.remove();
  }, 3000);
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now - date;
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (diffInMins < 60) {
    return `${diffInMins} minute${diffInMins !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Close modals when clicking outside
window.onclick = function(event) {
  const uploadModal = document.getElementById('uploadModal');
  const detailModal = document.getElementById('detailModal');

  if (event.target === uploadModal) {
    closeUploadModal();
  }
  if (event.target === detailModal) {
    closeDetailModal();
  }
};

// Tab switching functionality
function switchTab(view) {
  // Update tab buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });

  const marketplaceView = document.getElementById('marketplaceView');
  const dashboardView = document.getElementById('dashboardView');

  if (view === 'marketplace') {
    document.getElementById('marketplaceTab').classList.add('active');
    marketplaceView.style.display = 'block';
    dashboardView.style.display = 'none';
  } else if (view === 'dashboard') {
    document.getElementById('dashboardTab').classList.add('active');
    dashboardView.style.display = 'block';
    marketplaceView.style.display = 'none';
    loadDashboard();
  }
}

// Dashboard charts
let topAppsChart = null;
let categoriesChart = null;
let contributorsChart = null;
let levelsChart = null;
let mostCommentedChart = null;
let categoryPerformanceChart = null;

// Load dashboard data
async function loadDashboard() {
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const stats = await response.json();

    // Update stat cards
    document.getElementById('totalApps').textContent = stats.totalApps || 0;
    document.getElementById('totalLikes').textContent = stats.totalLikes || 0;
    document.getElementById('totalComments').textContent = stats.totalComments || 0;
    document.getElementById('totalContributors').textContent = stats.totalContributors || 0;

    // Populate contributors table
    populateContributorsTable(stats.allContributors);

    // Initialize charts
    initializeCharts(stats);

    // Load segment tools for admin section
    await loadSegments();
    renderAdminToolsList();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showMessage('Error loading dashboard data', 'error');
  }
}

// Populate contributors table
function populateContributorsTable(contributors) {
  const tbody = document.getElementById('contributorsTableBody');

  if (!contributors || contributors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.6);">
          No contributors yet.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = contributors.map((contributor, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(contributor.teacher_name)}</td>
      <td>${contributor.app_count}</td>
      <td>${contributor.total_likes}</td>
      <td>${contributor.total_comments}</td>
    </tr>
  `).join('');
}

// ==================== SEGMENT FUNCTIONS ====================

let segmentsData = {
  'EDUSPACE': [],
  'RE-EARTH': []
};
let currentAdminSegment = 'EDUSPACE';
let selectedIcon = 'default';

// Icon mapping for display
const iconMap = {
  'default': '&#128279;',
  'book': '&#128218;',
  'video': '&#127909;',
  'music': '&#127925;',
  'game': '&#127918;',
  'code': '&#128187;',
  'science': '&#128300;',
  'math': '&#128290;',
  'art': '&#127912;',
  'globe': '&#127757;',
  'star': '&#11088;',
  'rocket': '&#128640;',
  'tree': '&#127794;',
  'leaf': '&#127793;',
  'recycle': '&#9851;',
  'water': '&#128167;',
  'sun': '&#9728;',
  'lightning': '&#9889;'
};

// Load segments on page load
async function loadSegments() {
  try {
    const response = await fetch(`${API_BASE}/api/segments`);
    segmentsData = await response.json();
    renderSegmentTools('EDUSPACE');
    renderSegmentTools('RE-EARTH');
  } catch (error) {
    console.error('Error loading segments:', error);
  }
}

// Render segment tools in the expandable section
function renderSegmentTools(segmentId) {
  const tools = segmentsData[segmentId] || [];
  const containerId = segmentId === 'EDUSPACE' ? 'eduspaceTools' : 'reearthTools';
  const countId = segmentId === 'EDUSPACE' ? 'eduspaceCount' : 'reearthCount';
  const container = document.getElementById(containerId);
  const countEl = document.getElementById(countId);

  if (!container) return;

  // Update count
  if (countEl) {
    countEl.textContent = `${tools.length} tool${tools.length !== 1 ? 's' : ''}`;
  }

  if (tools.length === 0) {
    const emptyIcon = segmentId === 'EDUSPACE' ? '&#128640;' : '&#127793;';
    container.innerHTML = `
      <div class="segment-empty">
        <div class="segment-empty-icon">${emptyIcon}</div>
        <p>No tools yet. Admin can add tools from the dashboard.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tools.map(tool => `
    <a href="${escapeHtml(tool.url)}" target="_blank" class="segment-tool-item" title="${escapeHtml(tool.description || tool.name)}">
      <div class="segment-tool-icon">${iconMap[tool.icon] || iconMap['default']}</div>
      <span class="segment-tool-name">${escapeHtml(tool.name)}</span>
    </a>
  `).join('');
}

// Toggle segment expand/collapse
function toggleSegment(segment) {
  const segmentEl = document.getElementById(segment === 'eduspace' ? 'eduspaceSegment' : 'reearthSegment');
  if (segmentEl) {
    segmentEl.classList.toggle('expanded');
  }
}

// Admin: Select segment for management
function selectAdminSegment(segmentId) {
  currentAdminSegment = segmentId;

  // Update button states
  document.getElementById('adminBtnEduspace').classList.toggle('active', segmentId === 'EDUSPACE');
  document.getElementById('adminBtnReearth').classList.toggle('active', segmentId === 'RE-EARTH');

  // Update form title
  document.getElementById('segmentFormTitle').textContent = `Add Tool to ${segmentId}`;

  // Reset form
  cancelEditTool();

  // Render tools list for this segment
  renderAdminToolsList();
}

// Admin: Render tools list
function renderAdminToolsList() {
  const tools = segmentsData[currentAdminSegment] || [];
  const container = document.getElementById('adminToolsList');

  if (!container) return;

  if (tools.length === 0) {
    container.innerHTML = `
      <p style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 20px;">
        No tools in ${currentAdminSegment} yet. Add one above!
      </p>
    `;
    return;
  }

  container.innerHTML = tools.map(tool => `
    <div class="segment-tool-list-item">
      <div class="segment-tool-list-icon">${iconMap[tool.icon] || iconMap['default']}</div>
      <div class="segment-tool-list-info">
        <div class="segment-tool-list-name">${escapeHtml(tool.name)}</div>
        <div class="segment-tool-list-url">${escapeHtml(tool.url)}</div>
      </div>
      <div class="segment-tool-list-actions">
        <button class="btn-icon edit" onclick="editSegmentTool(${tool.id})" title="Edit">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon delete" onclick="deleteSegmentTool(${tool.id})" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Admin: Select icon
function selectIcon(icon) {
  selectedIcon = icon;

  // Update UI
  document.querySelectorAll('.icon-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.icon === icon);
  });
}

// Admin: Save segment tool (add or update)
async function saveSegmentTool() {
  const name = document.getElementById('toolName').value.trim();
  const url = document.getElementById('toolUrl').value.trim();
  const description = document.getElementById('toolDescription').value.trim();
  const editId = document.getElementById('editToolId').value;

  if (!name || !url) {
    alert('Please enter tool name and URL');
    return;
  }

  try {
    const toolData = {
      name,
      url,
      icon: selectedIcon,
      description
    };

    let response;
    if (editId) {
      // Update existing tool
      response = await fetch(`${API_BASE}/api/segments/${currentAdminSegment}/tools/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });
    } else {
      // Add new tool
      response = await fetch(`${API_BASE}/api/segments/${currentAdminSegment}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolData)
      });
    }

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      cancelEditTool();
      await loadSegments();
      renderAdminToolsList();
    } else {
      showMessage(data.error || 'Error saving tool', 'error');
    }
  } catch (error) {
    console.error('Error saving tool:', error);
    showMessage('Error saving tool. Please try again.', 'error');
  }
}

// Admin: Edit segment tool
function editSegmentTool(toolId) {
  const tools = segmentsData[currentAdminSegment] || [];
  const tool = tools.find(t => t.id === toolId);

  if (!tool) return;

  document.getElementById('editToolId').value = tool.id;
  document.getElementById('toolName').value = tool.name;
  document.getElementById('toolUrl').value = tool.url;
  document.getElementById('toolDescription').value = tool.description || '';

  // Select the icon
  selectIcon(tool.icon || 'default');

  // Update UI
  document.getElementById('segmentFormTitle').textContent = `Edit Tool in ${currentAdminSegment}`;
  document.getElementById('saveToolBtn').textContent = 'Update Tool';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';

  // Scroll to form
  document.getElementById('toolName').focus();
}

// Admin: Cancel edit
function cancelEditTool() {
  document.getElementById('editToolId').value = '';
  document.getElementById('toolName').value = '';
  document.getElementById('toolUrl').value = '';
  document.getElementById('toolDescription').value = '';
  selectIcon('default');

  document.getElementById('segmentFormTitle').textContent = `Add Tool to ${currentAdminSegment}`;
  document.getElementById('saveToolBtn').textContent = 'Add Tool';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

// Admin: Delete segment tool
async function deleteSegmentTool(toolId) {
  if (!confirm('Are you sure you want to delete this tool?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/segments/${currentAdminSegment}/tools/${toolId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      showMessage(data.message, 'success');
      await loadSegments();
      renderAdminToolsList();
    } else {
      showMessage(data.error || 'Error deleting tool', 'error');
    }
  } catch (error) {
    console.error('Error deleting tool:', error);
    showMessage('Error deleting tool. Please try again.', 'error');
  }
}

// Initialize all charts
function initializeCharts(stats) {
  // Most Liked Apps Chart
  if (topAppsChart) topAppsChart.destroy();
  const topAppsCtx = document.getElementById('topAppsChart').getContext('2d');
  topAppsChart = new Chart(topAppsCtx, {
    type: 'bar',
    data: {
      labels: stats.topApps.map(app => app.title.length > 20 ? app.title.substring(0, 20) + '...' : app.title),
      datasets: [{
        label: 'Likes',
        data: stats.topApps.map(app => app.likes),
        backgroundColor: 'rgba(255, 59, 48, 0.8)',
        borderColor: 'rgba(255, 59, 48, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Likes: ' + context.parsed.y;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });

  // Apps by Category Chart
  if (categoriesChart) categoriesChart.destroy();
  const categoriesCtx = document.getElementById('categoriesChart').getContext('2d');
  categoriesChart = new Chart(categoriesCtx, {
    type: 'doughnut',
    data: {
      labels: stats.categories.map(cat => cat.category),
      datasets: [{
        data: stats.categories.map(cat => cat.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
          'rgba(255, 99, 255, 0.8)',
          'rgba(99, 255, 132, 0.8)'
        ],
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: 'rgba(255, 255, 255, 0.9)',
            padding: 12,
            font: {
              size: 11
            }
          }
        }
      }
    }
  });

  // Top Contributors Chart
  if (contributorsChart) contributorsChart.destroy();
  const contributorsCtx = document.getElementById('contributorsChart').getContext('2d');
  contributorsChart = new Chart(contributorsCtx, {
    type: 'bar',
    data: {
      labels: stats.topContributors.map(c => c.teacher_name),
      datasets: [{
        label: 'Apps',
        data: stats.topContributors.map(c => c.count),
        backgroundColor: 'rgba(0, 122, 255, 0.8)',
        borderColor: 'rgba(0, 122, 255, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });

  // Apps by Student Level Chart
  if (levelsChart) levelsChart.destroy();
  const levelsCtx = document.getElementById('levelsChart').getContext('2d');
  levelsChart = new Chart(levelsCtx, {
    type: 'bar',
    data: {
      labels: stats.levels.map(l => l.level),
      datasets: [{
        label: 'Apps',
        data: stats.levels.map(l => l.count),
        backgroundColor: 'rgba(52, 199, 89, 0.8)',
        borderColor: 'rgba(52, 199, 89, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)',
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            display: false
          }
        }
      }
    }
  });

  // Most Commented Apps Chart
  if (mostCommentedChart) mostCommentedChart.destroy();
  const mostCommentedCtx = document.getElementById('mostCommentedChart').getContext('2d');
  mostCommentedChart = new Chart(mostCommentedCtx, {
    type: 'bar',
    data: {
      labels: stats.mostCommentedApps.map(app => app.title.length > 20 ? app.title.substring(0, 20) + '...' : app.title),
      datasets: [{
        label: 'Comments',
        data: stats.mostCommentedApps.map(app => app.comments),
        backgroundColor: 'rgba(255, 149, 0, 0.8)',
        borderColor: 'rgba(255, 149, 0, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Comments: ' + context.parsed.y;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });

  // Category Performance Chart
  if (categoryPerformanceChart) categoryPerformanceChart.destroy();
  const categoryPerformanceCtx = document.getElementById('categoryPerformanceChart').getContext('2d');
  categoryPerformanceChart = new Chart(categoryPerformanceCtx, {
    type: 'bar',
    data: {
      labels: stats.categoryPerformance.map(cat => cat.category.length > 15 ? cat.category.substring(0, 15) + '...' : cat.category),
      datasets: [{
        label: 'Avg Likes',
        data: stats.categoryPerformance.map(cat => cat.avg_likes.toFixed(1)),
        backgroundColor: 'rgba(175, 82, 222, 0.8)',
        borderColor: 'rgba(175, 82, 222, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Avg Likes: ' + context.parsed.x;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.8)'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}
