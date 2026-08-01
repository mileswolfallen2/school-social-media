const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const INITIAL = {
  users: [],
  posts: [],
  comments: [],
  likes: [],
};

let db = load();
let saveTimer = null;

function load() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      writeFile(INITIAL);
      return structuredClone(INITIAL);
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to load database, starting fresh:', err.message);
    return structuredClone(INITIAL);
  }
}

function writeFile(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      writeFile(db);
    } catch (err) {
      console.error('Failed to save database:', err.message);
    }
  }, 50);
}

function nextId(collection) {
  const max = db[collection].reduce((m, row) => Math.max(m, row.id), 0);
  return max + 1;
}

function insert(collection, row) {
  const id = nextId(collection);
  const record = { id, ...row };
  db[collection].push(record);
  persist();
  return record;
}

function findById(collection, id) {
  return db[collection].find((row) => row.id === id) || null;
}

function find(collection, predicate) {
  return db[collection].find(predicate) || null;
}

function findAll(collection, predicate) {
  return predicate ? db[collection].filter(predicate) : db[collection].slice();
}

function update(collection, id, changes) {
  const row = findById(collection, id);
  if (!row) return null;
  Object.assign(row, changes);
  persist();
  return row;
}

function remove(collection, id) {
  const index = db[collection].findIndex((row) => row.id === id);
  if (index === -1) return false;
  db[collection].splice(index, 1);
  persist();
  return true;
}

module.exports = { insert, findById, find, findAll, update, remove };
