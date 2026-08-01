const router = require('express').Router();
const bcrypt = require('bcryptjs');
const store = require('../store');
const { signToken } = require('../middleware/auth');

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

router.post('/register', (req, res) => {
  const { username, fullName, email, password, role = 'student' } = req.body || {};

  if (!username || !fullName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, . _ -).' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!['student', 'teacher', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const usernameTaken = store.find('users', (u) => u.username.toLowerCase() === username.toLowerCase());
  const emailTaken = store.find('users', (u) => u.email.toLowerCase() === email.toLowerCase());
  if (usernameTaken || emailTaken) {
    return res.status(409).json({ error: 'Username or email already in use.' });
  }

  const user = store.insert('users', {
    username,
    fullName,
    email,
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: Date.now(),
  });

  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = store.find(
    'users',
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  return res.json({ token: signToken(user), user: publicUser(user) });
});

module.exports = router;
