const { CALLBACK_ACTIONS, SESSION_KEYS, MESSAGES } = require('../../constants');
const { handleCallbackQuery: handleSpecificCallback } = require('./index');
const { sendOrEditMessage } = require('../utils');
const {
	createBackKeyboard,
	createStartKeyboard,
	createReviewPromptKeyboard,
} = require('../../keyboards');
const logger = require('../../logger');

const handleCallbackQuery = async (ctx) => {
	const action = ctx.callbackQuery.data;

	if (action === CALLBACK_ACTIONS.ASK_QUESTION) {
		ctx.session[SESSION_KEYS.AWAITING_QUESTION] = true;
		const sentMessage = await sendOrEditMessage(
			ctx,
			'Пожалуйста, задайте ваш вопрос:',
			createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
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
			`User ${ctx.chat.id} confirmed cancellation of rejection input`
		);
		await ctx.answerCallbackQuery();
	} else if (action === 'continue_input') {
		const sentMessage = await sendOrEditMessage(
			ctx,
			ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON]
				? 'Пожалуйста, укажите причину отклонения:'
				: 'Пожалуйста, укажите причину отклонения платежа:',
			createBackKeyboard(),
			true
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
		ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		logger.info(`User ${ctx.chat.id} continued rejection input`);
		await ctx.answerCallbackQuery();
	} else {
		await handleSpecificCallback(ctx);
	}
};

module.exports = { handleCallbackQuery };
