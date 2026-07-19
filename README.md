# ConvoDom

A real-time, web-based chat application with login/registration, user search, self messaging, real-time messaging, file sharing, and a built-in media player.

> Private project — shared for portfolio review only.

## Demo

[Watch the walkthrough video](https://drive.google.com/file/d/1sstEc9rEgbPJJvyGGyewTU72knWjxOpS/view?usp=drive_link)

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express, Socket.io
- **Databases:** MySQL (users), MongoDB/Mongoose (messages & rooms)
- **Other:** bcrypt, express-session, multer, dotenv

## Setup

```bash
npm install
cp .env.example .env   # fill in your local MySQL/MongoDB values
node server.js
```

Requires a running local MySQL and MongoDB instance. App runs at `http://localhost:3000`.

## Project Structure

```
chat-app/
├── frontend/       # HTML, CSS, JS, and media render modules
├── middleware/      # Upload handling
├── models/          # Mongoose schemas (messages, rooms)
├── routes/          # Express routes
├── utils/           # Helper functions
├── mongo.js         # MongoDB connection
├── mysql.js          # MySQL connection
└── server.js          # Entry point
```
