const { Bot, InlineKeyboard, session } = require('grammy');
require('dotenv').config();

const bot = new Bot(process.env.API_KEY);

const MESSAGES = {
	start:
		'Привет, *%s*! 👋\nБлагодарю, что решил довериться мне! Пожалуйста, ознакомьтесь с Условиями и Прайсом перед тем, как зададите свой вопрос. ❤️',
	terms:
		'📜 *Условия*:\n1. Задавайте вопросы четко.\n2. Оплата перед консультацией.\n3. Уважайте мое время.',
	price:
		'💰 *Прайс-лист*:\n1. Консультация (30 мин) - 5000 руб.\n2. Полный расклад - 10000 руб.\n3. Ответ на 1 вопрос - 2000 руб.',
	reviews: '🌟 *Отзывы*:\nАлиночка Котова - лучший таролог на Земле!',
	askQuestion: '✍️ Напишите свой вопрос, и я передам его администратору.',
	paymentRequired:
		'Пожалуйста, оплатите услугу перед тем, как задать вопрос. 💸',
	paymentConfirmed: 'Оплата подтверждена! Теперь вы можете задать вопрос. 😊',
};

// Создаем InlineKeyboard для главного меню
const createStartKeyboard = () => {
	return new InlineKeyboard()
		.text('Условия', 'show_terms')
		.text('Прайс', 'show_price')
		.row()
		.text('Отзывы', 'show_reviews')
		.text('Задать вопрос', 'ask_question');
};

bot.use(
	session({ initial: () => ({ hasPaid: false, awaitingQuestion: false }) })
);

bot.command('start', async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false; // Сбрасываем состояние
	await ctx.reply(MESSAGES.start.replace('%s', userName), {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
});

bot.callbackQuery('show_terms', async (ctx) => {
	ctx.session.awaitingQuestion = false; // Сбрасываем состояние
	const backKeyboard = new InlineKeyboard().text('Назад', 'back_to_menu');
	await ctx.editMessageText(MESSAGES.terms, {
		parse_mode: 'Markdown',
		reply_markup: backKeyboard,
	});
	await ctx.answerCallbackQuery();
});

bot.callbackQuery('show_price', async (ctx) => {
	ctx.session.awaitingQuestion = false; // Сбрасываем состояние
	const backKeyboard = new InlineKeyboard().text('Назад', 'back_to_menu');
	await ctx.editMessageText(MESSAGES.price, {
		parse_mode: 'Markdown',
		reply_markup: backKeyboard,
	});
	await ctx.answerCallbackQuery();
});

bot.callbackQuery('show_reviews', async (ctx) => {
	ctx.session.awaitingQuestion = false; // Сбрасываем состояние
	const backKeyboard = new InlineKeyboard().text('Назад', 'back_to_menu');
	await ctx.editMessageText(MESSAGES.reviews, {
		parse_mode: 'Markdown',
		reply_markup: backKeyboard,
	});
	await ctx.answerCallbackQuery();
});

bot.callbackQuery('ask_question', async (ctx) => {
	// if (!ctx.session.hasPaid) {
	// 	await ctx.reply(MESSAGES.paymentRequired, { parse_mode: 'Markdown' });
	// 	await ctx.answerCallbackQuery();
	// 	return;
	// }
	ctx.session.awaitingQuestion = true; // Устанавливаем состояние ожидания вопроса
	await ctx.editMessageText(MESSAGES.askQuestion, {
		parse_mode: 'Markdown',
		reply_markup: new InlineKeyboard().text('Назад', 'back_to_menu'),
	});
	await ctx.answerCallbackQuery();
});

bot.command('pay', async (ctx) => {
	ctx.session.hasPaid = true;
	ctx.session.awaitingQuestion = false; // Сбрасываем состояние
	await ctx.reply(MESSAGES.paymentConfirmed, { parse_mode: 'Markdown' });
});

// Обработка текстовых сообщений (вопросов)
bot.on('message:text', async (ctx) => {
	if (ctx.session.awaitingQuestion) {
		const question = ctx.message.text;
		const userInfo = ctx.from.username
			? `@${ctx.from.username}`
			: `ID ${ctx.from.id}`;
		const userName = ctx.from?.first_name || 'Пользователь';

		// Отправляем вопрос админу
		await bot.api.sendMessage(
			process.env.ADMIN_ID,
			`Новый вопрос от ${userInfo} (${userName}):\n${question}`
		);

		// Подтверждаем пользователю
		await ctx.reply('Ваш вопрос отправлен! Ожидайте ответа. 😊', {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});

		ctx.session.awaitingQuestion = false; // Сбрасываем состояние
	}
});

bot.callbackQuery('back_to_menu', async (ctx) => {
	try {
		const userName = ctx.from?.first_name || 'Друг';
		ctx.session.awaitingQuestion = false; // Сбрасываем состояние

		await ctx.editMessageText(MESSAGES.start.replace('%s', userName), {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});

		await ctx.answerCallbackQuery();
	} catch (error) {
		console.error('Ошибка в обработке кнопки "Назад":', error);
		await ctx.reply('Ой, что-то пошло не так! 😔 Попробуйте снова.', {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
		await ctx.answerCallbackQuery({ text: 'Ошибка, попробуйте снова' });
	}
});

bot.catch((err, ctx) => {
	console.error(`Error for update ${ctx.update.update_id}:`, err);
	ctx.reply('Ой, что-то пошло не так! 😔 Попробуйте позже.');
});

bot.start();
