const bcrypt = require('bcryptjs');
const store = require('./store');

const DEMO_USERS = [
  {
    username: 'alex',
    fullName: 'Alex Rivera',
    email: 'alex@school.edu',
    role: 'student',
    password: 'password123',
  },
  {
    username: 'mia',
    fullName: 'Mia Thompson',
    email: 'mia@school.edu',
    role: 'student',
    password: 'password123',
  },
  {
    username: 'ms.chan',
    fullName: 'Ms. Chan',
    email: 'chan@school.edu',
    role: 'teacher',
    password: 'password123',
  },
];

const DEMO_POSTS = [
  {
    authorId: 1,
    content: 'Anyone else super excited for the fall festival this Friday? I heard the robotics club is doing a demo!',
  },
  {
    authorId: 3,
    content: 'Reminder: the midterm review session for History is after school on Thursday in Room 204. Bring questions!',
  },
  {
    authorId: 2,
    content: 'Just found the best study playlist on the library computers. Come check it out — it saved my calc grade 🙌',
  },
  {
    authorId: 1,
    content: 'Trying to organize a pickup soccer game on the field after school. Anyone in?',
  },
  {
    authorId: 3,
    content: 'Congrats to the debate team on their win at regionals! So proud of you all. 🎉',
  },
];

function seed() {
  if (store.findAll('users').length > 0) return;

  const userIds = DEMO_USERS.map((u) => {
    const hash = bcrypt.hashSync(u.password, 10);
    return store
      .insert('users', {
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        passwordHash: hash,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      })
      .id;
  });

  DEMO_POSTS.forEach((post, i) => {
    const created = Date.now() - (20 - i) * 60 * 60 * 1000;
    const newPost = store.insert('posts', {
      authorId: userIds[post.authorId - 1],
      content: post.content,
      createdAt: created,
    });

    if (i === 0) {
      store.insert('comments', {
        postId: newPost.id,
        authorId: userIds[2],
        content: 'Can’t wait! See you there.',
        createdAt: created + 10 * 60 * 1000,
      });
    }
    if (i === 3) {
      store.insert('likes', {
        postId: newPost.id,
        userId: userIds[1],
        createdAt: created + 5 * 60 * 1000,
      });
    }
  });

  console.log('Seeded demo data.');
}

module.exports = { seed };
