const $ = (sel) => document.querySelector(sel);

const API = '/api';
const TOKEN_KEY = 'schoolhub_token';
const USER_KEY = 'schoolhub_user';

let currentUser = null;
let posts = [];

const authView = $('#auth-view');
const mainView = $('#main-view');

const HEART_OUTLINE =
  '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
const HEART_FILLED =
  '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></svg>';
const COMMENT_ICON =
  '<svg class="icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const TRASH_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>';

// ---------- Session ----------

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
    const err = new Error(data.error || 'Request failed.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Toasts ----------

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

// ---------- Confirm modal ----------

function confirmDialog(title, text) {
  return new Promise((resolve) => {
    const modal = $('#confirm-modal');
    $('#modal-title').textContent = title;
    $('#modal-text').textContent = text;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('open'));

    const done = (val) => {
      modal.classList.remove('open');
      setTimeout(() => modal.classList.add('hidden'), 220);
      $('#modal-confirm').removeEventListener('click', onYes);
      $('#modal-cancel').removeEventListener('click', onNo);
      modal.removeEventListener('click', onBg);
      resolve(val);
    };
    const onYes = () => done(true);
    const onNo = () => done(false);
    const onBg = (e) => { if (e.target === modal) done(false); };

    $('#modal-confirm').addEventListener('click', onYes);
    $('#modal-cancel').addEventListener('click', onNo);
    modal.addEventListener('click', onBg);
  });
}

// ---------- View switching ----------

function fadeIn(el) {
  el.classList.remove('hidden');
  el.classList.remove('anim-fade-in');
  void el.offsetWidth;
  el.classList.add('anim-fade-in');
}

function fadeOut(el, done) {
  el.classList.add('anim-fade-out');
  setTimeout(() => {
    el.classList.add('hidden');
    el.classList.remove('anim-fade-out');
    if (done) done();
  }, 260);
}

function showView(view) {
  const other = view === authView ? mainView : authView;
  if (!other.classList.contains('hidden')) {
    fadeOut(other, () => fadeIn(view));
  } else {
    fadeIn(view);
  }
}

// ---------- Auth view ----------

function showAuthError(message) {
  const el = $('#auth-error');
  el.textContent = message;
  el.classList.remove('hidden');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#login-form').classList.toggle('hidden', tab !== 'login');
  $('#register-form').classList.toggle('hidden', tab !== 'register');
  $('#auth-error').classList.add('hidden');
}

function renderAuth() {
  showView(authView);
}

// ---------- Main view ----------

function renderMain() {
  $('#welcome').textContent = currentUser.fullName;
  setRoleBadge($('#user-role'), currentUser.role);
  setRoleBadge($('#profile-role-badge'), currentUser.role);
  $('#profile-name').textContent = currentUser.fullName;
  $('#profile-username').textContent = `@${currentUser.username}`;

  const name = currentUser.fullName;
  setAvatar($('#profile-avatar'), name);
  setAvatar($('#composer-avatar'), name);

  showView(mainView);
  loadFeed();
}

function setRoleBadge(el, role) {
  el.textContent = role;
  el.className = `role-badge role-${role}`;
}

function setAvatar(el, name) {
  el.textContent = initials(name);
  el.style.setProperty('--hue', avatarHue(name));
}

function avatarHue(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

// ---------- Rendering helpers ----------

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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

function postHtml(post, index = 0) {
  const authorName = post.author ? post.author.fullName : 'Deleted user';
  const authorUsername = post.author ? `@${post.author.username}` : '';
  const avatarName = post.author ? post.author.fullName : 'Deleted user';
  const hue = post.author ? avatarHue(post.author.fullName) : 0;
  const delay = Math.min(index, 7) * 70;
  const roleText =
    post.author && post.author.role !== 'student' ? ` · ${post.author.role}` : '';

  const comments = post.comments
    .map((c) => {
      const cName = c.author ? c.author.fullName : 'Deleted user';
      return `
        <div class="comment" data-comment-id="${c.id}">
          <div class="avatar" style="--hue:${c.author ? avatarHue(cName) : 0}">${c.author ? initials(cName) : '?'}</div>
          <div class="comment-body">
            <div>
              <span class="comment-author">${c.author ? c.author.fullName : 'Deleted user'}</span>
              <span class="comment-meta">${timeAgo(c.createdAt)}</span>
            </div>
            <div class="comment-text">${escapeHtml(c.content)}</div>
          </div>
          ${canDeleteComment(post, c) ? '<button class="comment-delete" title="Delete comment">✕</button>' : ''}
        </div>`;
    })
    .join('');

  return `
    <article class="post card" data-post-id="${post.id}" style="animation-delay:${delay}ms">
      <div class="post-header">
        <div class="avatar" style="--hue:${hue}">${initials(avatarName)}</div>
        <div>
          <div class="post-author">${authorName} <span class="post-username">${authorUsername}</span></div>
          <div class="post-meta">${timeAgo(post.createdAt)}${roleText}</div>
        </div>
        ${canDeletePost(post) ? `<button class="post-delete" title="Delete post">${TRASH_ICON}</button>` : ''}
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="action-btn like-btn ${post.likedByViewer ? 'liked' : ''}" data-post-id="${post.id}">
          ${post.likedByViewer ? HEART_FILLED : HEART_OUTLINE}
          <span class="like-count">${post.likeCount}</span>
        </button>
        <button class="action-btn comment-toggle" data-post-id="${post.id}">
          ${COMMENT_ICON} <span>${post.comments.length}</span>
        </button>
      </div>
      <div class="comments">
        ${comments}
        ${commentFormHtml(post)}
      </div>
    </article>`;
}

function skeletonHtml(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="post card skeleton" style="animation-delay:${i * 90}ms">
        <div class="skeleton-line w30"></div>
        <div class="skeleton-line w80"></div>
        <div class="skeleton-line w60"></div>
      </div>`;
  }
  return html;
}

async function loadFeed() {
  const feed = $('#feed');
  feed.innerHTML = skeletonHtml(3);
  $('#feed-empty').classList.add('hidden');

  try {
    const data = await api('/posts');
    posts = data.posts;
    feed.innerHTML = posts.map((p, i) => postHtml(p, i)).join('');
    $('#feed-empty').classList.toggle('hidden', posts.length > 0);
  } catch (err) {
    feed.innerHTML = '';
    if (err.status === 401) {
      clearSession();
      toast('Session expired. Please log in again.', 'error');
      renderAuth();
      return;
    }
    toast(err.message, 'error');
    $('#feed-empty').classList.remove('hidden');
  }
}

function updatePost(post) {
  const index = posts.findIndex((p) => p.id === post.id);
  if (index !== -1) posts[index] = post;
  const node = document.querySelector(`.post[data-post-id="${post.id}"]`);
  if (node) {
    const wasOpen = node.querySelector('.comments')?.classList.contains('open');
    node.outerHTML = postHtml(post);
    if (wasOpen) {
      const fresh = document.querySelector(`.post[data-post-id="${post.id}"] .comments`);
      if (fresh) fresh.classList.add('open');
    }
  }
  $('#feed-empty').classList.toggle('hidden', posts.length > 0);
}

function animateLikeButton(btn, post) {
  btn.classList.toggle('liked', post.likedByViewer);
  btn.innerHTML = `${post.likedByViewer ? HEART_FILLED : HEART_OUTLINE}<span class="like-count">${post.likeCount}</span>`;
  btn.classList.remove('pop');
  void btn.offsetWidth;
  btn.classList.add('pop');
  btn.addEventListener('animationend', () => btn.classList.remove('pop'), { once: true });
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
    toast(`Welcome back, ${data.user.fullName.split(' ')[0]}!`, 'success');
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
    toast(`Account created — welcome to SchoolHub!`, 'success');
    renderMain();
  } catch (err) {
    showAuthError(err.message);
  }
});

$('#logout-btn').addEventListener('click', () => {
  clearSession();
  toast('Logged out. See you soon!', 'info');
  renderAuth();
});

$('#post-submit').addEventListener('click', submitPost);

$('#post-input').addEventListener('input', (e) => {
  const count = e.target.value.length;
  const el = $('#post-char-count');
  el.textContent = `${count}/500`;
  el.classList.toggle('warn', count >= 400);
});

$('#post-input').addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    submitPost();
  }
});

async function submitPost() {
  const input = $('#post-input');
  const content = input.value.trim();
  if (!content) return;

  const btn = $('#post-submit');
  btn.disabled = true;

  try {
    const data = await api('/posts', { method: 'POST', body: JSON.stringify({ content }) });
    posts.unshift(data.post);
    input.value = '';
    $('#post-char-count').textContent = '0/500';

    const feed = $('#feed');
    const wrap = document.createElement('div');
    wrap.innerHTML = postHtml(data.post, 0);
    const node = wrap.firstElementChild;
    node.classList.remove('post');
    node.classList.add('post', 'post-new');
    feed.prepend(node);

    $('#feed-empty').classList.add('hidden');
    toast('Post published!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

$('#feed').addEventListener('click', async (e) => {
  const likeBtn = e.target.closest('.like-btn');
  if (likeBtn) {
    try {
      const data = await api(`/posts/${likeBtn.dataset.postId}/like`, { method: 'POST' });
      const idx = posts.findIndex((p) => p.id === data.post.id);
      if (idx !== -1) posts[idx] = data.post;
      animateLikeButton(likeBtn, data.post);
    } catch (err) {
      toast(err.message, 'error');
    }
    return;
  }

  const toggleBtn = e.target.closest('.comment-toggle');
  if (toggleBtn) {
    const post = document.querySelector(`.post[data-post-id="${toggleBtn.dataset.postId}"]`);
    const comments = post.querySelector('.comments');
    comments.classList.toggle('open');
    return;
  }

  const deleteComment = e.target.closest('.comment-delete');
  if (deleteComment) {
    const commentNode = deleteComment.closest('.comment');
    const postId = deleteComment.closest('.post').dataset.postId;
    commentNode.classList.add('removing');
    setTimeout(async () => {
      try {
        const data = await api(`/posts/comments/${commentNode.dataset.commentId}`, { method: 'DELETE' });
        if (data.post) updatePost(data.post);
        else loadFeed();
        toast('Comment deleted', 'success');
      } catch (err) {
        toast(err.message, 'error');
        loadFeed();
      }
    }, 200);
    return;
  }

  const deletePost = e.target.closest('.post-delete');
  if (deletePost) {
    const postNode = deletePost.closest('.post');
    const postId = Number(postNode.dataset.postId);
    const ok = await confirmDialog('Delete this post?', 'This will permanently remove it and its comments.');
    if (!ok) return;

    postNode.classList.add('removing');
    setTimeout(async () => {
      try {
        await api(`/posts/${postId}`, { method: 'DELETE' });
        posts = posts.filter((p) => p.id !== postId);
        postNode.remove();
        $('#feed-empty').classList.toggle('hidden', posts.length > 0);
        toast('Post deleted', 'success');
      } catch (err) {
        toast(err.message, 'error');
        loadFeed();
      }
    }, 260);
  }
});

$('#feed').addEventListener('submit', async (e) => {
  if (!e.target.classList.contains('comment-form')) return;
  e.preventDefault();
  const form = e.target;
  const input = form.querySelector('input');
  const content = input.value.trim();
  if (!content) return;

  input.value = '';
  try {
    const data = await api(`/posts/${form.dataset.postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    updatePost(data.post);

    const fresh = document.querySelector(`.post[data-post-id="${data.post.id}"]`);
    const comments = fresh.querySelector('.comments');
    comments.classList.add('open');
    const last = comments.querySelector('.comment:last-child');
    if (last) last.classList.add('comment-new');
  } catch (err) {
    toast(err.message, 'error');
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
