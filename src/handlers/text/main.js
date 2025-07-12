// src/handlers/text/main.js
const { handleText: handleSpecificText } = require('./index');
const { handleAdminAnswer } = require('../utils/admin');
const { addDialogueMessage } = require('../../services/questions');
const { addSupportDialogueMessage } = require('../../services/support');
const { updatePaymentStatus } = require('../../services/payments');
const {
	createBackKeyboard,
	createUserQuestionActionKeyboard,
	createUserSupportQuestionActionKeyboard,
	createStartKeyboard,
} = require('../../keyboards');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');
const { SESSION_KEYS, MESSAGES } = require('../../constants');
const logger = require('../../logger');

const handleText = async (ctx) => {
	logger.info(
		`Text message received from user ${ctx.from.id}: ${ctx.message.text}`
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
			backKeyboard: createBackKeyboard(),
		});
	} else if (ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER]) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID];
		await handleAdminAnswer(ctx, questionId, ctx.message.text, {
			addMessage: addSupportDialogueMessage,
			userKeyboard: createUserSupportQuestionActionKeyboard,
			collection: 'support question',
			successMessage: 'вопросу техподдержки',
			backKeyboard: createBackKeyboard(),
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
				'Платеж отклонен, причина отправлена пользователю.',
				createBackKeyboard(),
				true
			);
			logger.info(
				`Payment ${paymentId} rejected by admin for user ${payment.userId}`
			);
		} else {
			await sendOrEditMessage(
				ctx,
				'Ошибка: платеж не найден.',
				createBackKeyboard(),
				true
			);
			logger.error(`Payment ${paymentId} not found for rejection`);
		}
		ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] = false;
		ctx.session[SESSION_KEYS.PAYMENT_ID] = null;
	} else {
		await handleSpecificText(ctx);
	}
};

module.exports = { handleText };
