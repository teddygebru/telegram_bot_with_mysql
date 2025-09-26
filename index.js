// index.js - Telegram Bot Logic

// Load environment variables.
require('dotenv').config();

// Load the database pool from db.js.
const pool = require('./db');

// Import the Telegram Bot API library.
const TelegramBot = require('node-telegram-bot-api');

// Get your bot token from the environment variables.
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a new bot instance.
const bot = new TelegramBot(token, { polling: true });

// Listen for the /start command from a user.
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const { first_name, last_name, username } = msg.from;

    let connection;
    try {
        // Get a connection from the pool.
        connection = await pool.getConnection();

        // Check if the user already exists using the user_id, which is a unique key.
        const [rows] = await connection.execute('SELECT * FROM users WHERE user_id = ?', [userId]);

        // If the user does not exist, insert them.
        if (rows.length === 0) {
            await connection.execute(
                'INSERT INTO users (user_id, chat_id, first_name, last_name, username, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [userId, chatId, first_name, last_name, username]
            );
            console.log(`New user inserted: ${userId}`);
            bot.sendMessage(chatId, `Hello ${first_name}, you are now registered! To finish, please share your contact by clicking the button below.`, {
                reply_markup: {
                    keyboard: [[{ text: 'Share Contact', request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        } else {
            console.log(`User already exists: ${userId}`);
            bot.sendMessage(chatId, `Welcome back, ${first_name}! Please share your contact by clicking the button below.`, {
                reply_markup: {
                    keyboard: [[{ text: 'Share Contact', request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                },
            });
        }
    } catch (error) {
        console.error('Error handling start command:', error);
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool.
        }
    }
});

// Handle when the user shares their phone number.
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const phoneNumber = msg.contact.phone_number;

    let connection;
    try {
        // Get a connection from the pool.
        connection = await pool.getConnection();

        // Update the user's information with their phone number.
        // The column in the table is named 'telegram_user_id', not 'phone_number'.
        await connection.execute('UPDATE users SET telegram_user_id = ? WHERE user_id = ?', [phoneNumber, userId]);
        console.log(`User ${userId} updated with phone number.`);
        bot.sendMessage(chatId, 'Thank you! Your phone number has been saved.', {
            reply_markup: {
                remove_keyboard: true
            }
        });
    } catch (error) {
        console.error('Error handling contact message:', error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
});
