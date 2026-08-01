# SchoolHub — School Social Media

A school social media platform with a Node.js/Express backend and a plain
HTML/CSS/JS frontend. No external database required — data persists to a JSON
file.

## Features

- User registration and login with JWT auth (passwords hashed with bcrypt)
- Roles: student, teacher, staff
- Post feed, create/delete posts
- Comments and replies
- Like/unlike posts
- Teachers/staff can moderate (delete any post or comment)

## Setup

```bash
npm install
npm start
```

Then open http://localhost:3000

For development with auto-restart: `npm run dev`

## Demo accounts

| Username  | Password      | Role    |
| --------- | ------------- | ------- |
| `alex`    | `password123` | Student |
| `mia`     | `password123` | Student |
| `ms.chan` | `password123` | Teacher |

The app seeds these demo accounts and a few posts on first run.

## API

Base URL: `http://localhost:3000/api`

| Method | Endpoint                   | Description                          | Auth |
| ------ | -------------------------- | ------------------------------------ | ---- |
| POST   | `/auth/register`           | Create account                       | No   |
| POST   | `/auth/login`              | Log in, get JWT                      | No   |
| GET    | `/users/me`                | Current user profile                 | Yes  |
| GET    | `/users`                   | List users                           | Yes  |
| GET    | `/users/:id`               | User profile + their posts           | Yes  |
| GET    | `/posts`                   | Feed (newest first)                  | Yes  |
| POST   | `/posts`                   | Create post                          | Yes  |
| POST   | `/posts/:id/comments`      | Add comment                          | Yes  |
| POST   | `/posts/:id/like`          | Toggle like                          | Yes  |
| DELETE | `/posts/:id`               | Delete post (author or moderator)    | Yes  |
| DELETE | `/posts/comments/:id`      | Delete comment (author/moderator)    | Yes  |

Authenticated requests send `Authorization: Bearer <token>`.

## Project structure

```
server/
  index.js        Express app entry point
  store.js        JSON file persistence layer
  seed.js         Demo data
  middleware/     JWT auth middleware
  routes/         auth, users, posts
public/
  index.html      Frontend
  style.css
  app.js
data/
  db.json         Auto-generated data store
```
