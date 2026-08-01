const $ = (sel) => document.querySelector(sel);

const API = '/api';
const TOKEN_KEY = 'schoolhub_token';
const USER_KEY = 'schoolhub_user';

let currentUser = null;
let posts = [];

function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  currentUser = null;
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}

// ---------- Auth view ----------

function showAuthError(message) {
  const el = $('#auth-error');
  el.textContent = message;
  el.classList.remove('hidden');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#login-form').classList.toggle('hidden', tab !== 'login');
  $('#register-form').classList.toggle('hidden', tab !== 'register');
  $('#auth-error').classList.add('hidden');
}

function renderAuth() {
  $('#auth-view').classList.remove('hidden');
  $('#main-view').classList.add('hidden');
}

// ---------- Main view ----------

function renderMain() {
  $('#auth-view').classList.add('hidden');
  $('#main-view').classList.remove('hidden');
  $('#welcome').textContent = currentUser.fullName;
  $('#user-role').textContent = currentUser.role;
  loadFeed();
}

function timeAgo(ts) {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function canDeletePost(post) {
  return currentUser && (post.author.id === currentUser.id || currentUser.role !== 'student');
}

function canDeleteComment(post, comment) {
  return (
    currentUser &&
    (comment.author.id === currentUser.id ||
      post.author.id === currentUser.id ||
      currentUser.role !== 'student')
  );
}

function commentFormHtml(post) {
  return `
    <form class="comment-form" data-post-id="${post.id}">
      <input type="text" placeholder="Write a comment…" maxlength="500" required />
      <button class="btn primary" type="submit">Reply</button>
    </form>`;
}

function postHtml(post) {
  const authorName = post.author ? post.author.fullName : 'Deleted user';
  const authorUsername = post.author ? `@${post.author.username}` : '';

  const comments = post.comments
    .map(
      (c) => `
        <div class="comment" data-comment-id="${c.id}">
          <div class="avatar">${c.author ? initials(c.author.fullName) : '?'}</div>
          <div class="comment-body">
            <div>
              <span class="comment-author">${c.author ? c.author.fullName : 'Deleted user'}</span>
              <span class="comment-meta">${timeAgo(c.createdAt)}</span>
            </div>
            <div>${escapeHtml(c.content)}</div>
          </div>
          ${canDeleteComment(post, c) ? '<button class="comment-delete" title="Delete comment">×</button>' : ''}
        </div>`
    )
    .join('');

  const commentCount = post.comments.length;

  return `
    <article class="post card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="avatar">${initials(authorName)}</div>
        <div>
          <div class="post-author">${authorName} <span class="post-meta">${authorUsername}</span></div>
          <div class="post-meta">${timeAgo(post.createdAt)}${post.author && post.author.role !== 'student' ? ' · ' + post.author.role : ''}</div>
        </div>
        ${canDeletePost(post) ? '<button class="post-delete" title="Delete post" style="margin-left:auto">×</button>' : ''}
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="action-btn like-btn ${post.likedByViewer ? 'liked' : ''}" data-post-id="${post.id}">
          ${post.likedByViewer ? '❤️' : '🤍'} <span>${post.likeCount}</span>
        </button>
        <button class="action-btn comment-toggle" data-post-id="${post.id}">💬 ${commentCount}</button>
      </div>
      <div class="comments hidden">
        ${comments}
        ${commentFormHtml(post)}
      </div>
    </article>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadFeed() {
  try {
    const data = await api('/posts');
    posts = data.posts;
    const feed = $('#feed');
    feed.innerHTML = posts.map(postHtml).join('');
    $('#feed-empty').classList.toggle('hidden', posts.length > 0);
  } catch (err) {
    alert(err.message);
  }
}

function updatePost(post) {
  const index = posts.findIndex((p) => p.id === post.id);
  if (index !== -1) posts[index] = post;
  const node = document.querySelector(`.post[data-post-id="${post.id}"]`);
  if (node) node.outerHTML = postHtml(post);
  $('#feed-empty').classList.toggle('hidden', posts.length > 0);
}

// ---------- Events ----------

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('#login-username').value.trim(),
        password: $('#login-password').value,
      }),
    });
    storeSession(data.token, data.user);
    renderMain();
  } catch (err) {
    showAuthError(err.message);
  }
});

$('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: $('#reg-fullname').value.trim(),
        username: $('#reg-username').value.trim(),
        email: $('#reg-email').value.trim(),
        role: $('#reg-role').value,
        password: $('#reg-password').value,
      }),
    });
    storeSession(data.token, data.user);
    renderMain();
  } catch (err) {
    showAuthError(err.message);
  }
});

$('#logout-btn').addEventListener('click', () => {
  clearSession();
  renderAuth();
});

$('#post-submit').addEventListener('click', async () => {
  const input = $('#post-input');
  const content = input.value.trim();
  if (!content) return;
  try {
    const data = await api('/posts', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    input.value = '';
    $('#post-char-count').textContent = '0/500';
    loadFeed();
  } catch (err) {
    alert(err.message);
  }
});

$('#post-input').addEventListener('input', (e) => {
  $('#post-char-count').textContent = `${e.target.value.length}/500`;
});

$('#feed').addEventListener('click', async (e) => {
  const likeBtn = e.target.closest('.like-btn');
  if (likeBtn) {
    try {
      const data = await api(`/posts/${likeBtn.dataset.postId}/like`, { method: 'POST' });
      updatePost(data.post);
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  const toggleBtn = e.target.closest('.comment-toggle');
  if (toggleBtn) {
    const post = document.querySelector(`.post[data-post-id="${toggleBtn.dataset.postId}"]`);
    const comments = post.querySelector('.comments');
    comments.classList.toggle('hidden');
    return;
  }

  const deleteComment = e.target.closest('.comment-delete');
  if (deleteComment) {
    const commentNode = deleteComment.closest('.comment');
    const postNode = deleteComment.closest('.post');
    try {
      const data = await api(`/posts/comments/${commentNode.dataset.commentId}`, { method: 'DELETE' });
      if (data.post) updatePost(data.post);
      else loadFeed();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  const deletePost = e.target.closest('.post-delete');
  if (deletePost) {
    const postNode = deletePost.closest('.post');
    if (!confirm('Delete this post?')) return;
    try {
      await api(`/posts/${postNode.dataset.postId}`, { method: 'DELETE' });
      loadFeed();
    } catch (err) {
      alert(err.message);
    }
  }
});

$('#feed').addEventListener('submit', async (e) => {
  if (!e.target.classList.contains('comment-form')) return;
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input');
  const content = input.value.trim();
  if (!content) return;
  try {
    const data = await api(`/posts/${form.dataset.postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    updatePost(data.post);
  } catch (err) {
    alert(err.message);
  }
});

// ---------- Boot ----------

function boot() {
  const saved = localStorage.getItem(USER_KEY);
  const t = token();
  if (saved && t) {
    currentUser = JSON.parse(saved);
    renderMain();
  } else {
    renderAuth();
  }
}

boot();
