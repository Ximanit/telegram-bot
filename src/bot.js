const { Bot, session, Composer } = require('grammy');
const { MongoDBAdapter } = require('@grammyjs/storage-mongodb');
const { connectDB, updateSession } = require('./db');
require('dotenv').config();
const logger = require('./logger');
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
	createUserQuestionActionKeyboard,
	createReviewPromptKeyboard,
	createUserSupportQuestionActionKeyboard,
} = require('./keyboards');
const { handleError, sendOrEditMessage } = require('./handlers/utils');
const {
	updateQuestionStatus,
	addDialogueMessage,
} = require('./services/questions');
const { addSupportDialogueMessage } = require('./services/support');
const { MESSAGES } = require('./constants');

if (!process.env.API_KEY || !process.env.ADMIN_ID) {
	logger.error('API_KEY или ADMIN_ID не указаны в .env');
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
					hasPaid: false,
					awaitingQuestion: false,
					awaitingReview: false,
					awaitingPaymentPhoto: false,
					awaitingAnswer: false,
					awaitingRejectReason: false,
					awaitingRejectPaymentReason: false,
					awaitingSupportQuestion: false,
					awaitingSupportAnswer: false,
					currentQuestionId: null,
					currentSupportQuestionId: null,
					cart: [],
					paidServices: [],
					questionCount: 0,
					paymentId: null,
					lastMessageId: {}, // Гарантируем инициализацию как объекта
					history: [],
				}),
			})
		);
		logger.info('Сессии настроены с MongoDB');
	} catch (error) {
		logger.error('Ошибка при инициализации MongoDB:', {
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

bot.on('callback_query:data', async (ctx) => {
	logger.info(
		`Callback query received: ${ctx.callbackQuery.data} from user ${ctx.from.id}`
	);
	if (ctx.callbackQuery.data === 'ask_question') {
		ctx.session.awaitingQuestion = true;
		const sentMessage = await sendOrEditMessage(
			ctx,
			'Пожалуйста, задайте ваш вопрос:',
			createBackKeyboard(ctx.session.questionCount)
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		await ctx.answerCallbackQuery();
	} else if (ctx.callbackQuery.data === 'back') {
		ctx.session.awaitingQuestion = false;
		ctx.session.awaitingReview = false;
		ctx.session.awaitingPaymentPhoto = false;
		ctx.session.awaitingAnswer = false;
		ctx.session.awaitingRejectReason = false;
		ctx.session.awaitingRejectPaymentReason = false;
		ctx.session.currentQuestionId = null;
		ctx.session.currentSupportQuestionId = null;
		ctx.session.paymentId = null;
		ctx.session.lastAction = null;

		logger.info(
			`Back button pressed by user ${ctx.chat.id}, History: ${JSON.stringify(
				ctx.session.history
			)}`
		);

		if (ctx.session.history.length > 1) {
			ctx.session.history.pop();
			const previousState = ctx.session.history.pop();
			if (previousState) {
				const sentMessage = await sendOrEditMessage(
					ctx,
					previousState.text,
					previousState.keyboard,
					false,
					true
				);
				ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
				logger.info(
					`Restored state for user ${ctx.chat.id}: ${previousState.text}`
				);
			} else {
				logger.warn(`Empty history state for chat ${ctx.chat.id}`);
				const userName = ctx.from?.first_name || 'Друг';
				const sentMessage = await sendOrEditMessage(
					ctx,
					MESSAGES.start.replace('%s', userName),
					createStartKeyboard(ctx.session.questionCount),
					false,
					true
				);
				ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			}
		} else {
			ctx.session.history = [];
			const userName = ctx.from?.first_name || 'Друг';
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.start.replace('%s', userName),
				createStartKeyboard(ctx.session.questionCount),
				false,
				true
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			logger.info(
				`History empty or single state, returned to start menu for user ${ctx.chat.id}`
			);
		}
		await ctx.answerCallbackQuery();
	} else {
		await handleCallbackQuery(ctx);
	}
});

bot.on('message:text', async (ctx) => {
	logger.info(
		`Text message received from user ${ctx.from.id}: ${ctx.message.text}`
	);
	if (
		ctx.session.awaitingRejectReason &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session.currentQuestionId;
		const rejectReason = ctx.message.text;
		const question = await updateQuestionStatus(
			questionId,
			'rejected',
			rejectReason
		);
		if (question) {
			const userCtx = {
				chat: { id: question.userId },
				session: ctx.session,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const sentMessage = await sendOrEditMessage(
				userCtx,
				`${MESSAGES.questionRejectedWithReason.replace(
					'%reason',
					rejectReason
				)}\n${MESSAGES.promptReviewAfterClose}`,
				createReviewPromptKeyboard()
			);
			ctx.session.lastMessageId[question.userId] = sentMessage.message_id;

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Вопрос отклонен, причина отправлена пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = adminMessage.message_id;
			ctx.session.awaitingRejectReason = false;
			ctx.session.currentQuestionId = null;
			logger.info(
				`Question ${questionId} rejected by admin for user ${question.userId}`
			);
		} else {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Ошибка: вопрос не найден.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			logger.error(`Question ${questionId} not found for rejection`);
		}
	} else if (
		ctx.session.awaitingRejectPaymentReason &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const paymentId = ctx.session.paymentId;
		const rejectReason = ctx.message.text;
		const payment = await updatePaymentStatus(
			paymentId,
			'rejected',
			null,
			rejectReason
		);
		if (payment) {
			const userCtx = {
				chat: { id: payment.userId },
				session: ctx.session,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const sentMessage = await sendOrEditMessage(
				userCtx,
				`${MESSAGES.paymentRejectedWithReason.replace(
					'%reason',
					rejectReason
				)}`,
				createStartKeyboard(0)
			);
			ctx.session.lastMessageId[payment.userId] = sentMessage.message_id;

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Платеж отклонен, причина отправлена пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = adminMessage.message_id;
			ctx.session.awaitingRejectPaymentReason = false;
			ctx.session.paymentId = null;
			logger.info(
				`Payment ${paymentId} rejected by admin for user ${payment.userId}`
			);
		} else {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Ошибка: платеж не найден.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			logger.error(`Payment ${paymentId} not found for rejection`);
		}
	} else if (
		ctx.session.awaitingAnswer &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session.currentQuestionId;
		const answer = ctx.message.text;
		const question = await addDialogueMessage(questionId, 'admin', answer);
		if (question) {
			const db = await connectDB();
			const sessions = db.collection('sessions');
			const userSession = await sessions.findOne({
				key: question.userId.toString(),
			});
			if (!userSession) {
				logger.error(`Session for user ${question.userId} not found`);
				const sentMessage = await ctx.api.sendMessage(
					ctx.chat.id,
					'Ошибка: сессия пользователя не найдена.',
					{
						parse_mode: 'Markdown',
						reply_markup: createBackKeyboard(),
					}
				);
				ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
				await updateSession(ctx.from.id, {
					lastMessageId: ctx.session.lastMessageId,
					awaitingAnswer: false,
				});
				return;
			}

			const userCtx = {
				chat: { id: question.userId },
				session: userSession.value,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const sentMessage = await sendOrEditMessage(
				userCtx,
				`Сообщение от администратора по вашему вопросу #${questionId}:\n${answer}`,
				createUserQuestionActionKeyboard(questionId)
			);
			userSession.value.lastMessageId = userSession.value.lastMessageId || {};
			userSession.value.lastMessageId[question.userId] = sentMessage.message_id;
			await updateSession(question.userId, {
				lastMessageId: userSession.value.lastMessageId,
			});

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Сообщение отправлено пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = adminMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
				awaitingAnswer: false,
			});
			logger.info(
				`Admin answered question ${questionId} for user ${question.userId}`
			);
		} else {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Ошибка: вопрос не найден.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
			});
			logger.error(`Question ${questionId} not found for answering`);
		}
	} else if (
		ctx.session.awaitingSupportAnswer &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session.currentSupportQuestionId;
		const answer = ctx.message.text;
		const question = await addSupportDialogueMessage(
			questionId,
			'admin',
			answer
		);
		if (question) {
			const userCtx = {
				chat: { id: question.userId },
				session: ctx.session,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const sentMessage = await sendOrEditMessage(
				userCtx,
				`Сообщение от администратора по вашему вопросу техподдержки #${questionId}:\n${answer}`,
				createUserSupportQuestionActionKeyboard(questionId)
			);
			ctx.session.lastMessageId[question.userId] = sentMessage.message_id;

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Сообщение отправлено пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = adminMessage.message_id;
			ctx.session.awaitingSupportAnswer = false;
			ctx.session.currentSupportQuestionId = null;
			logger.info(
				`Admin answered support question ${questionId} for user ${question.userId}`
			);
		} else {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Ошибка: вопрос техподдержки не найден.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			logger.error(`Support question ${questionId} not found for answering`);
		}
	} else {
		await handleText(ctx);
	}
});

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
		const sentMessage = await ctx.api.sendMessage(
			ctx.chat.id,
			'Фото чека отправлено на проверку администратору.',
			{
				parse_mode: 'Markdown',
				reply_markup: createStartKeyboard(ctx.session.questionCount),
			}
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		logger.info(
			`Payment photo uploaded for payment ${ctx.session.paymentId} by user ${ctx.from.id}`
		);
	}
});

bot.catch((err, ctx) => {
	logger.error(
		`Error for update ${ctx?.update?.update_id ?? 'unknown'}: ${err.message}`,
		{ stack: err.stack }
	);
	handleError(err, ctx);
});

// Запуск бота
bot.start().catch((err) => {
	logger.error('Ошибка при запуске бота:', {
		error: err.message,
		stack: err.stack,
	});
	process.exit(1);
});

module.exports = bot;
