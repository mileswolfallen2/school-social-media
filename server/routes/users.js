const router = require('express').Router();
const store = require('../store');
const { requireAuth } = require('../middleware/auth');

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

router.get('/me', requireAuth, (req, res) => {
  const user = store.findById('users', req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  return res.json({ user: publicUser(user) });
});

router.get('/', requireAuth, (req, res) => {
  const users = store.findAll('users').map(publicUser);
  return res.json({ users });
});

router.get('/:id', requireAuth, (req, res) => {
  const user = store.findById('users', Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const posts = store
    .findAll('posts', (p) => p.authorId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  return res.json({ user: publicUser(user), posts });
});

module.exports = router;
