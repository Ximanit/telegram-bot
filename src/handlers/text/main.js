const { CALLBACK_ACTIONS, SESSION_KEYS, MESSAGES } = require('../../constants');
const { handleText: handleSpecificText } = require('./index');
const {
	updateQuestionStatus,
	addDialogueMessage,
} = require('../../services/questions');
const { addSupportDialogueMessage } = require('../../services/support');
const { sendOrEditMessage } = require('../utils');
const {
	createBackKeyboard,
	createStartKeyboard,
	createReviewPromptKeyboard,
	createUserQuestionActionKeyboard,
	createUserSupportQuestionActionKeyboard,
} = require('../../keyboards');
const { connectDB, updateSession } = require('../../db');
const logger = require('../../logger');

const handleText = async (ctx) => {
	logger.info(
		`Text message received from user ${ctx.from.id}: ${ctx.message.text}`
	);

	if (
		ctx.session[SESSION_KEYS.AWAITING_ANSWER] &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID];
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
				await sendOrEditMessage(
					ctx,
					'Ошибка: сессия пользователя не найдена.',
					createBackKeyboard(),
					true
				);
				ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
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
			await updateSession(question.userId, {
				lastMessageId: { [question.userId]: sentMessage.message_id },
			});
			await sendOrEditMessage(
				ctx,
				'Сообщение отправлено пользователю.',
				createBackKeyboard(),
				true
			);
			ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
			logger.info(
				`Admin answered question ${questionId} for user ${question.userId}`
			);
		} else {
			await sendOrEditMessage(
				ctx,
				'Ошибка: вопрос не найден.',
				createBackKeyboard(),
				true
			);
			logger.error(`Question ${questionId} not found for answering`);
		}
	} else if (
		ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const paymentId = ctx.session[SESSION_KEYS.PAYMENT_ID];
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
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][payment.userId] =
				sentMessage.message_id;

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Платеж отклонен, причина отправлена пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				adminMessage.message_id;
			ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] = false;
			ctx.session[SESSION_KEYS.PAYMENT_ID] = null;
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
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.error(`Payment ${paymentId} not found for rejection`);
		}
	} else if (
		ctx.session[SESSION_KEYS.AWAITING_ANSWER] &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID];
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
				ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
					sentMessage.message_id;
				ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
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
			userSession.value[SESSION_KEYS.LAST_MESSAGE_ID] =
				userSession.value[SESSION_KEYS.LAST_MESSAGE_ID] || {};
			userSession.value[SESSION_KEYS.LAST_MESSAGE_ID][question.userId] =
				sentMessage.message_id;
			await updateSession(question.userId, {
				[SESSION_KEYS.LAST_MESSAGE_ID]:
					userSession.value[SESSION_KEYS.LAST_MESSAGE_ID],
			});

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Сообщение отправлено пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				adminMessage.message_id;
			ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
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
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.error(`Question ${questionId} not found for answering`);
		}
	} else if (
		ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER] &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID];
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
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][question.userId] =
				sentMessage.message_id;

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Сообщение отправлено пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				adminMessage.message_id;
			ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER] = false;
			ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = null;
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
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.error(`Support question ${questionId} not found for answering`);
		}
	} else {
		await handleSpecificText(ctx);
	}
};

module.exports = { handleText };
