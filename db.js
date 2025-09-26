// db.js - Database connection setup

// Load environment variables from the .env file.
require('dotenv').config();

// Import the MySQL2 library to create a connection pool.
const mysql = require('mysql2/promise');

// Create the connection pool with your credentials.
// These credentials MUST match what you have in your .env file.
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the pool so it can be used in other files like index.js.
module.exports = pool;
