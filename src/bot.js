const { Bot, session } = require('grammy');
const { FileAdapter } = require('@grammyjs/storage-file');
require('dotenv').config();
const { handleStart } = require('./handlers/commands/start');
const { handleMeow } = require('./handlers/commands/meow');
const { handleHelp } = require('./handlers/commands/help');
const { handleCallbackQuery } = require('./handlers/callbacks');
const { handleText } = require('./handlers/text');
const {
	updatePaymentStatus,
	savePaymentPhoto,
} = require('./services/payments');
const {
	createPaymentConfirmationKeyboard,
	createStartKeyboard,
	createBackKeyboard,
} = require('./keyboards');
const { handleError } = require('./handlers/utils');

if (!process.env.API_KEY || !process.env.ADMIN_ID) {
	console.error('Ошибка: API_KEY или ADMIN_ID не указаны в .env');
	process.exit(1);
}

const bot = new Bot(process.env.API_KEY);

bot.use(
	session({
		storage: new FileAdapter({ dir: '/src/data/sessions' }),
		initial: () => ({
			hasPaid: false,
			awaitingQuestion: false,
			awaitingReview: false,
			awaitingPaymentPhoto: false,
			cart: [],
			paidServices: [],
			questionCount: 0,
			paymentId: null,
		}),
	})
);

bot.command('start', handleStart);
bot.command('meow', handleMeow);
bot.command('help', handleHelp);

bot.on('callback_query:data', async (ctx) => {
	if (ctx.callbackQuery.data === 'ask_question') {
		ctx.session.awaitingQuestion = true;
		await ctx.editMessageText('Пожалуйста, задайте ваш вопрос:', {
			parse_mode: 'Markdown',
			reply_markup: createBackKeyboard(ctx.session.questionCount),
		});
		await ctx.answerCallbackQuery();
	} else {
		await handleCallbackQuery(ctx);
	}
});

bot.on('message:text', handleText);

bot.on('message:photo', async (ctx) => {
	if (ctx.session.awaitingPaymentPhoto && ctx.session.paymentId) {
		const photo = ctx.message.photo[ctx.message.photo.length - 1];
		const photoPath = await savePaymentPhoto(
			photo.file_id,
			ctx.session.paymentId,
			ctx
		);
		await updatePaymentStatus(ctx.session.paymentId, 'pending', photoPath);
		await ctx.api.sendPhoto(process.env.ADMIN_ID, photo.file_id, {
			caption: `Новый платеж от @${
				ctx.from.username || `ID ${ctx.from.id}`
			}\nСумма: ${ctx.session.cart.reduce(
				(sum, item) => sum + item.price * item.quantity,
				0
			)} руб.`,
			reply_markup: createPaymentConfirmationKeyboard(ctx.session.paymentId),
		});
		ctx.session.awaitingPaymentPhoto = false;
		ctx.session.paymentId = null;
		await ctx.reply('Фото чека отправлено на проверку администратору.', {
			reply_markup: createStartKeyboard(ctx.session.questionCount),
		});
	}
});

bot.catch(handleError);

module.exports = bot;
