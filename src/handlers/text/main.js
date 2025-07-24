const { handleText: handleSpecificText } = require('./index');
const { handleAdminAnswer } = require('../utils/admin');
const {
	addDialogueMessage,
	updateQuestionStatus,
} = require('../../services/questions');
const { addSupportDialogueMessage } = require('../../services/support');
const { updatePaymentStatus } = require('../../services/payments');
const {
	createBackKeyboard,
	createUserQuestionActionKeyboard,
	createUserSupportQuestionActionKeyboard,
	createStartKeyboard,
	createBackKeyboardADmin,
} = require('../../keyboards');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');
const { SESSION_KEYS, MESSAGES } = require('../../constants');
const logger = require('../../logger');

const handleText = async (ctx) => {
	logger.info(
		`Получено текстовое сообщение от пользователя ${ctx.from.id}: ${ctx.message.text}`
	);

	if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
		return handleSpecificText(ctx);
	}

	if (ctx.session[SESSION_KEYS.AWAITING_ANSWER]) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID];
		await handleAdminAnswer(ctx, questionId, ctx.message.text, {
			addMessage: addDialogueMessage,
			userKeyboard: createUserQuestionActionKeyboard,
			collection: 'question',
			successMessage: 'вопросу',
			backKeyboard: createBackKeyboardADmin(),
		});
	} else if (ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER]) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID];
		await handleAdminAnswer(ctx, questionId, ctx.message.text, {
			addMessage: addSupportDialogueMessage,
			userKeyboard: createUserSupportQuestionActionKeyboard,
			collection: 'support question',
			successMessage: 'вопросу техподдержки',
			backKeyboard: createBackKeyboardADmin(),
		});
		ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = null;
	} else if (ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON]) {
		const paymentId = ctx.session[SESSION_KEYS.PAYMENT_ID];
		const rejectReason = ctx.message.text;
		const payment = await updatePaymentStatus(
			paymentId,
			'rejected',
			null,
			rejectReason
		);
		if (payment) {
			await sendMessageToUser(
				payment.userId,
				MESSAGES.paymentRejectedWithReason.replace('%reason', rejectReason),
				createStartKeyboard(0),
				ctx
			);
			await sendOrEditMessage(
				ctx,
				MESSAGES.paymentRejectedReasonSend,
				createBackKeyboardADmin(),
				true
			);
			logger.info(
				`Платеж ${paymentId} отклонен администратором для пользователя ${payment.userId}`
			);
		} else {
			await sendOrEditMessage(
				ctx,
				MESSAGES.errorPaymentNotFound,
				createBackKeyboard(),
				true
			);
			logger.error(`Платеж ${paymentId} не найден при отклонении`);
		}
		ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] = false;
		ctx.session[SESSION_KEYS.PAYMENT_ID] = null;
	} else if (
		ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON] &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID];
		const rejectReason = ctx.message.text;
		const question = await updateQuestionStatus(
			questionId,
			'rejected',
			rejectReason
		);
		if (question) {
			await sendMessageToUser(
				question.userId,
				`${MESSAGES.questionRejectedWithReason.replace(
					'%reason',
					rejectReason
				)}`,
				createBackKeyboard(),
				ctx
			);

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				MESSAGES.questionRejectedReasonSendToUser,
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				adminMessage.message_id;
			ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON] = false;
			ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
			logger.info(
				`Вопрос ${questionId} отклонен администратором для пользователя ${question.userId}`
			);
		} else {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				MESSAGES.questionNotFound,
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.error(`Вопрос ${questionId} не найден при отклонении`);
		}
	} else {
		await handleSpecificText(ctx);
	}
};

module.exports = { handleText };
