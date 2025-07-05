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
	createQuestionActionKeyboard,
	createUserQuestionActionKeyboard,
} = require('./keyboards');
const { handleError, sendOrEditMessage } = require('./handlers/utils');
const {
	updateQuestionStatus,
	addDialogueMessage,
	getQuestions,
} = require('./services/questions');

const { MESSAGES } = require('./constants');

if (!process.env.API_KEY || !process.env.ADMIN_ID) {
	console.error('Ошибка: API_KEY или ADMIN_ID не указаны в .env');
	process.exit(1);
}

const bot = new Bot(process.env.API_KEY);

bot.use(
	session({
		storage: new FileAdapter({ dir: './src/data/sessions' }),
		initial: () => ({
			hasPaid: false,
			awaitingQuestion: false,
			awaitingReview: false,
			awaitingPaymentPhoto: false,
			awaitingAnswer: false,
			awaitingRejectReason: false,
			currentQuestionId: null,
			cart: [],
			paidServices: [],
			questionCount: 0,
			paymentId: null,
			lastMessageId: {},
			history: [],
		}),
	})
);

bot.command('start', handleStart);
bot.command('meow', handleMeow);
bot.command('help', handleHelp);

bot.on('callback_query:data', async (ctx) => {
	if (ctx.callbackQuery.data === 'ask_question') {
		ctx.session.awaitingQuestion = true;
		await sendOrEditMessage(
			ctx,
			'Пожалуйста, задайте ваш вопрос:',
			createBackKeyboard(ctx.session.questionCount)
		);
		await ctx.answerCallbackQuery();
	} else {
		await handleCallbackQuery(ctx);
	}
});

bot.on('message:text', async (ctx) => {
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
			const storage = new FileAdapter({ dir: './src/data/sessions' });
			const userSession = (await storage.read(question.userId.toString())) || {
				hasPaid: false,
				awaitingQuestion: false,
				awaitingReview: false,
				awaitingPaymentPhoto: false,
				awaitingAnswer: false,
				awaitingRejectReason: false,
				currentQuestionId: null,
				cart: [],
				paidServices: [],
				questionCount: 0,
				paymentId: null,
				lastMessageId: {},
			};

			const userCtx = {
				chat: { id: question.userId },
				session: userSession,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			await sendOrEditMessage(
				userCtx,
				MESSAGES.questionRejectedWithReason.replace('%reason', rejectReason),
				createStartKeyboard(userSession.questionCount)
			);

			await storage.write(question.userId.toString(), userSession);

			const sentMessage = await ctx.reply(
				'Вопрос отклонен, причина отправлена пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			ctx.session.awaitingRejectReason = false;
			ctx.session.currentQuestionId = null;
		} else {
			const sentMessage = await ctx.reply('Ошибка: вопрос не найден.', {
				parse_mode: 'Markdown',
				reply_markup: createBackKeyboard(),
			});
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		}
	} else if (
		ctx.session.awaitingAnswer &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session.currentQuestionId;
		const answer = ctx.message.text;
		const question = await addDialogueMessage(questionId, 'admin', answer);
		if (question) {
			// Получаем сессию пользователя
			const storage = new FileAdapter({ dir: './src/data/sessions' });
			const userSession = (await storage.read(question.userId.toString())) || {
				hasPaid: false,
				awaitingQuestion: false,
				awaitingReview: false,
				awaitingPaymentPhoto: false,
				awaitingAnswer: false,
				awaitingRejectReason: false,
				currentQuestionId: null,
				cart: [],
				paidServices: [],
				questionCount: 0,
				paymentId: null,
				lastMessageId: {},
			};

			// Создаем временный контекст для отправки сообщения пользователю
			const userCtx = {
				chat: { id: question.userId },
				session: userSession,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			// Отправляем сообщение пользователю с редактированием
			await sendOrEditMessage(
				userCtx,
				`Сообщение от администратора по вашему вопросу #${questionId}:\n${answer}`,
				createUserQuestionActionKeyboard(questionId)
			);

			// Сохраняем обновленную сессию пользователя
			await storage.write(question.userId.toString(), userSession);

			const sentMessage = await ctx.reply(
				'Сообщение отправлено пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			ctx.session.awaitingAnswer = false;
		} else {
			const sentMessage = await ctx.reply('Ошибка: вопрос не найден.', {
				parse_mode: 'Markdown',
				reply_markup: createBackKeyboard(),
			});
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
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
		const sentMessage = await ctx.reply(
			'Фото чека отправлено на проверку администратору.',
			{
				parse_mode: 'Markdown',
				reply_markup: createStartKeyboard(ctx.session.questionCount),
			}
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
	}
});

bot.catch(handleError);

module.exports = bot;
