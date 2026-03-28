const mysql = require("mysql2/promise");

const connection = await mysql.createConnection({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: process.env.MYSQLPORT
});

connection.connect((err) => {
    if (err) {
        console.error("DB connection failed:", err);
    } else {
        console.log("Connected to Railway MySQL 🚀");
    }
});

module.exports = connection;