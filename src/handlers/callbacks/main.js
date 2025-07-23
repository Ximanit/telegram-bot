const { CALLBACK_ACTIONS, SESSION_KEYS, MESSAGES } = require('../../constants');
const { handleCallbackQuery: handleSpecificCallback } = require('./index');
const { sendOrEditMessage } = require('../utils');
const {
	createBackKeyboard,
	createStartKeyboard,
	createBackKeyboardADmin,
} = require('../../keyboards');
const logger = require('../../logger');

const handleCallbackQuery = async (ctx) => {
	const action = ctx.callbackQuery.data;

	// Логирование callback-запроса
	logger.info('Получен callback-запрос', {
		action,
		userId: ctx.from?.id,
		chatId: ctx.chat?.id,
		username: ctx.from?.username || 'unknown',
		queryId: ctx.callbackQuery?.id,
	});

	if (action === CALLBACK_ACTIONS.ASK_QUESTION) {
		ctx.session[SESSION_KEYS.AWAITING_QUESTION] = true;
		const sentMessage = await sendOrEditMessage(
			ctx,
			MESSAGES.sendYourQuestion,
			createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
		logger.info(`Пользователь ${ctx.chat.id} начал ввод вопроса`);
		await ctx.answerCallbackQuery();
	} else if (action === 'confirm_cancel_reject') {
		ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON] = false;
		ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] = false;
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
		ctx.session[SESSION_KEYS.PAYMENT_ID] = null;
		ctx.session[SESSION_KEYS.LAST_ACTION] = null;

		const userName = ctx.from?.first_name || 'Друг';
		const sentMessage = await sendOrEditMessage(
			ctx,
			MESSAGES.start.replace('%s', userName),
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
			true
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
		logger.info(
			`Пользователь ${ctx.chat.id} подтвердил отмену ввода причины отклонения`
		);
		await ctx.answerCallbackQuery();
	} else if (action === 'continue_input') {
		const sentMessage = await sendOrEditMessage(
			ctx,
			ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON]
				? MESSAGES.enterReasonReject
				: MESSAGES.rejectPaymentReasonPrompt,
			createBackKeyboardADmin(),
			true
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
		ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		logger.info(
			`Пользователь ${ctx.chat.id} продолжил ввод причины отклонения`
		);
		await ctx.answerCallbackQuery();
	} else {
		await handleSpecificCallback(ctx);
	}
};

module.exports = { handleCallbackQuery };
