const { Bot, Keyboard } = require('grammy');

require('dotenv').config();

const bot = new Bot(process.env.API_KEY);

bot.command('start', async (ctx) => {
	const startKeyboard = new Keyboard()
		.text('Условия')
		.text('Прайс')
		.row()
		.text('Отзывы')
		.text('Задать вопрос')
		.resized();

	await ctx.reply(
		'Приветствую всех, кто зашёл в этот чат. Благодарю, что решили \n довериться мне! Пожалуйста, ознакомьтесь с Условиями и\n Прайсом перед тем, как зададите свой (-и) вопрос (-ы).❤️',
		{ reply_markup: startKeyboard }
	);
});

bot.hears('Условия', async (ctx) => {
	await ctx.reply(`Сначала деньги, потом рассклад`);
});
bot.hears('Прайс', async (ctx) => {
	await ctx.reply(`Сто тыщ мильонов`);
});
bot.hears('Отзывы', async (ctx) => {
	await ctx.reply(`Алиночка Котова - самый лучший таролог на Земле`);
});
bot.hears('Задать вопрос', async (ctx) => {
	await ctx.reply(`Задавайте свои вопросы сюда, но сначала деньги`);
});

bot.catch((err) => {
	const ctx = err.ctx;
	console.error(`Error while handling update ${ctx.update.update_id}:`);
	const e = err.error;
	if (e instanceof GrammyError) {
		console.error('Error in request:', e.description);
	} else if (e instanceof HttpError) {
		console.error('Could not contact Telegram:', e);
	} else {
		console.error('Unknown error:', e);
	}
});

bot.start();
