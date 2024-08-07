const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('bot.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, is_banned INTEGER)");
    db.run("CREATE TABLE IF NOT EXISTS advertisement (id INTEGER PRIMARY KEY, text TEXT)");
    db.run("INSERT OR IGNORE INTO advertisement (id, text) VALUES (1, 'Default advertisement text')");
});

module.exports = db;
