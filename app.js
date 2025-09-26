// app.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2/promise'); // Using promise wrapper for async/await

const app = express();
const server = http.createServer(app);
// 1. Initialize Socket.IO Server
const io = new Server(server, {
    // Crucial: Use the path cPanel sets up if necessary, or leave blank:
    // path: "/my-app-url/" 
}); 

// 2. Initialize Telegram Bot
const BOT_TOKEN = process.env.BOT_TOKEN || '8341170645:AAE8_WzQ48unW2idpODAqY7SUPW88XwHJSM';
const bot = new TelegramBot(BOT_TOKEN, { polling: true }); // Polling is often easier on shared hosting

// 3. Database Connection Pool
let db;
async function connectDB() {
    try {
        db = await mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'telegram_db',
        });
        console.log('Database connected successfully.');
    } catch (error) {
        console.error('Database connection failed:', error.message);
    }
}

// === BOT LOGIC: Responds and emits data via Socket.IO ===
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Save message to MySQL
    const [result] = await db.execute(
        'INSERT INTO messages (chat_id, text) VALUES (?, ?)',
        [chatId, messageText]
    );
    
    // Emit real-time update to all connected web clients
    io.emit('new_message', {
        id: result.insertId,
        user: msg.from.username || msg.from.first_name,
        text: messageText,
        time: new Date().toLocaleTimeString()
    });

    // Send a reply via Telegram
    bot.sendMessage(chatId, `Received: "${messageText}". Real-time update emitted.`);
});

// === SOCKET.IO LOGIC: Handles web client connections ===
io.on('connection', (socket) => {
    console.log('A user connected via Socket.IO');
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// === EXPRESS SERVER: Serves a simple index page ===
app.get('/', (req, res) => {
    res.send('<h1>Telegram Bot and Socket.IO Server is running!</h1>');
});


// Start the server
const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
});