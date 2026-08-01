const router = require('express').Router();
const store = require('../store');
const { requireAuth } = require('../middleware/auth');

const MAX_CONTENT_LENGTH = 500;

function attachMeta(post, viewerId) {
  const author = store.findById('users', post.authorId);
  const comments = store
    .findAll('comments', (c) => c.postId === post.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((c) => {
      const commentAuthor = store.findById('users', c.authorId);
      return {
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: commentAuthor
          ? {
              id: commentAuthor.id,
              username: commentAuthor.username,
              fullName: commentAuthor.fullName,
              role: commentAuthor.role,
            }
          : null,
      };
    });
  const likeCount = store.findAll('likes', (l) => l.postId === post.id).length;
  const likedByViewer = store.find('likes', (l) => l.postId === post.id && l.userId === viewerId);

  return {
    ...post,
    author: author
      ? {
          id: author.id,
          username: author.username,
          fullName: author.fullName,
          role: author.role,
        }
      : null,
    comments,
    likeCount,
    likedByViewer: !!likedByViewer,
  };
}

function isModerator(user) {
  return user && user.role !== 'student';
}

router.get('/', requireAuth, (req, res) => {
  const posts = store
    .findAll('posts')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((post) => attachMeta(post, req.user.id));

  return res.json({ posts });
});

router.post('/', requireAuth, (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `Post must be ${MAX_CONTENT_LENGTH} characters or fewer.` });
  }

  const post = store.insert('posts', {
    authorId: req.user.id,
    content: content.trim(),
    createdAt: Date.now(),
  });

  return res.status(201).json({ post: attachMeta(post, req.user.id) });
});

router.post('/:id/comments', requireAuth, (req, res) => {
  const post = store.findById('posts', Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const { content } = req.body || {};
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: `Comment must be ${MAX_CONTENT_LENGTH} characters or fewer.` });
  }

  const comment = store.insert('comments', {
    postId: post.id,
    authorId: req.user.id,
    content: content.trim(),
    createdAt: Date.now(),
  });

  return res.status(201).json({ comment, post: attachMeta(post, req.user.id) });
});

router.post('/:id/like', requireAuth, (req, res) => {
  const post = store.findById('posts', Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existing = store.find('likes', (l) => l.postId === post.id && l.userId === req.user.id);

  if (existing) {
    store.remove('likes', existing.id);
  } else {
    store.insert('likes', { postId: post.id, userId: req.user.id, createdAt: Date.now() });
  }

  return res.json({ post: attachMeta(post, req.user.id) });
});

router.delete('/:id', requireAuth, (req, res) => {
  const post = store.findById('posts', Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const isAuthor = post.authorId === req.user.id;
  if (!isAuthor && !isModerator(store.findById('users', req.user.id))) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  store.remove('posts', post.id);
  store
    .findAll('comments', (c) => c.postId === post.id)
    .forEach((c) => store.remove('comments', c.id));
  store
    .findAll('likes', (l) => l.postId === post.id)
    .forEach((l) => store.remove('likes', l.id));

  return res.json({ message: 'Post deleted.' });
});

router.delete('/comments/:id', requireAuth, (req, res) => {
  const comment = store.findById('comments', Number(req.params.id));
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const post = store.findById('posts', comment.postId);
  const viewer = store.findById('users', req.user.id);

  const isCommentAuthor = comment.authorId === req.user.id;
  const isPostAuthor = post && post.authorId === req.user.id;
  if (!isCommentAuthor && !isPostAuthor && !isModerator(viewer)) {
    return res.status(403).json({ error: 'You cannot delete this comment.' });
  }

  store.remove('comments', comment.id);

  const updated = post ? attachMeta(post, req.user.id) : null;
  return res.json({ message: 'Comment deleted.', post: updated });
});

module.exports = router;
