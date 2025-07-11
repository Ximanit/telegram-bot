const { Bot, session, Composer } = require('grammy');
const { MongoDBAdapter } = require('@grammyjs/storage-mongodb');
const { connectDB } = require('./db');
require('dotenv').config();
const logger = require('./logger');
const { handleStart } = require('./handlers/commands/start');
const { handleMeow } = require('./handlers/commands/meow');
const { handleHelp } = require('./handlers/commands/help');
const { handleCallbackQuery } = require('./handlers/callbacks/main');
const { handleText } = require('./handlers/text/main');
const { handleError } = require('./handlers/utils');
const { SESSION_KEYS } = require('./constants');
const {
	savePaymentPhoto,
	updatePaymentStatus,
} = require('./services/payments');
const {
	createPaymentConfirmationKeyboard,
	createStartKeyboard,
} = require('./keyboards');

if (
	!process.env.API_KEY ||
	!process.env.ADMIN_ID ||
	!process.env.CARD_DETAILS
) {
	logger.error('API_KEY, ADMIN_ID или CARD_DETAILS не указаны в .env', {
		env: process.env,
	});
	process.exit(1);
}

const bot = new Bot(process.env.API_KEY);
const composer = new Composer();

// Инициализация MongoDB и сессий
(async () => {
	try {
		const db = await connectDB();
		composer.use(
			session({
				storage: new MongoDBAdapter({
					collection: db.collection('sessions'),
				}),
				initial: () => ({
					[SESSION_KEYS.HAS_PAID]: false,
					[SESSION_KEYS.AWAITING_QUESTION]: false,
					[SESSION_KEYS.AWAITING_REVIEW]: false,
					[SESSION_KEYS.AWAITING_PAYMENT_PHOTO]: false,
					[SESSION_KEYS.AWAITING_ANSWER]: false,
					[SESSION_KEYS.AWAITING_REJECT_REASON]: false,
					[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON]: false,
					[SESSION_KEYS.AWAITING_SUPPORT_QUESTION]: false,
					[SESSION_KEYS.AWAITING_SUPPORT_ANSWER]: false,
					[SESSION_KEYS.CURRENT_QUESTION_ID]: null,
					[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID]: null,
					[SESSION_KEYS.CART]: [],
					[SESSION_KEYS.PAID_SERVICES]: [],
					[SESSION_KEYS.QUESTION_COUNT]: 0,
					[SESSION_KEYS.PAYMENT_ID]: null,
					[SESSION_KEYS.LAST_MESSAGE_ID]: {},
					[SESSION_KEYS.HISTORY]: [],
				}),
			})
		);
		logger.info('Сессии настроены с MongoDB');
	} catch (error) {
		logger.error('Ошибка при инициализации MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		process.exit(1);
	}
})();

// Регистрируем composer на боте
bot.use(composer);

// Регистрация обработчиков
bot.command('start', handleStart);
bot.command('meow', handleMeow);
bot.command('help', handleHelp);
bot.on('callback_query:data', handleCallbackQuery);
bot.on('message:text', handleText);
bot.on('message:photo', async (ctx) => {
	if (
		ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO] &&
		ctx.session[SESSION_KEYS.PAYMENT_ID]
	) {
		try {
			const photo = ctx.message.photo[ctx.message.photo.length - 1];
			const photoFileId = await savePaymentPhoto(
				photo.file_id,
				ctx.session[SESSION_KEYS.PAYMENT_ID],
				ctx
			);
			await updatePaymentStatus(
				ctx.session[SESSION_KEYS.PAYMENT_ID],
				'pending',
				photoFileId
			);
			await ctx.api.sendPhoto(process.env.ADMIN_ID, photo.file_id, {
				caption: `Новый платеж от @${
					ctx.from.username || `ID ${ctx.from.id}`
				}\nСумма: ${ctx.session[SESSION_KEYS.CART].reduce(
					(sum, item) => sum + item.price * item.quantity,
					0
				)} руб.`,
				reply_markup: createPaymentConfirmationKeyboard(
					ctx.session[SESSION_KEYS.PAYMENT_ID]
				),
			});
			ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO] = false;
			ctx.session[SESSION_KEYS.PAYMENT_ID] = null;
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Фото чека отправлено на проверку администратору.',
				{
					parse_mode: 'Markdown',
					reply_markup: createStartKeyboard(
						ctx.session[SESSION_KEYS.QUESTION_COUNT]
					),
				}
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.info('Payment photo uploaded', {
				paymentId: ctx.session[SESSION_KEYS.PAYMENT_ID],
				userId: ctx.from.id,
				chatId: ctx.chat.id,
			});
		} catch (error) {
			logger.error('Ошибка обработки фото платежа', {
				error: error.message,
				stack: error.stack,
				userId: ctx.from.id,
				chatId: ctx.chat.id,
			});
			await handleError(error, ctx);
		}
	}
});

bot.catch((err, ctx) => {
	logger.error('Ошибка бота', {
		updateId: ctx?.update?.update_id ?? 'unknown',
		error: err.message,
		stack: err.stack,
		userId: ctx?.from?.id,
		chatId: ctx?.chat?.id,
	});
	handleError(err, ctx);
});

// Запуск бота
bot.start().catch((err) => {
	logger.error('Ошибка при запуске бота', {
		error: err.message,
		stack: err.stack,
	});
	process.exit(1);
});

module.exports = bot;
