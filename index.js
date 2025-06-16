const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.API_KEY);
bot.start((ctx) => ctx.reply('Welcome'));
bot.help((ctx) => ctx.reply('Send me a sticker'));
bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('Мяу', (ctx) => ctx.reply('Мяу-мяу'));
bot.on('message', (ctx) => {
	console.log(ctx);
});
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
