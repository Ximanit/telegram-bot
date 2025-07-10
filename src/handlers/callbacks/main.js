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
	} else if (action === CALLBACK_ACTIONS.BACK) {
		ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
		ctx.session[SESSION_KEYS.AWAITING_REVIEW] = false;
		ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO] = false;
		ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
		ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON] = false;
		ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] = false;
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
		ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = null;
		ctx.session[SESSION_KEYS.PAYMENT_ID] = null;

		logger.info(
			`Back button pressed by user ${ctx.chat.id}, History: ${JSON.stringify(
				ctx.session[SESSION_KEYS.HISTORY]
			)}`
		);

		if (ctx.session[SESSION_KEYS.HISTORY].length > 1) {
			ctx.session[SESSION_KEYS.HISTORY].pop();
			const previousState = ctx.session[SESSION_KEYS.HISTORY].pop();
			if (previousState) {
				const sentMessage = await sendOrEditMessage(
					ctx,
					previousState.text,
					previousState.keyboard,
					false,
					true
				);
				ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
					sentMessage.message_id;
				logger.info(
					`Restored state for user ${ctx.chat.id}: ${previousState.text}`
				);
			} else {
				logger.warn(`Empty history state for chat ${ctx.chat.id}`);
				const userName = ctx.from?.first_name || 'Друг';
				const sentMessage = await sendOrEditMessage(
					ctx,
					MESSAGES.start.replace('%s', userName),
					createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
					false,
					true
				);
				ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
					sentMessage.message_id;
			}
		} else {
			ctx.session[SESSION_KEYS.HISTORY] = [];
			const userName = ctx.from?.first_name || 'Друг';
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.start.replace('%s', userName),
				createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
				false,
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.info(
				`History empty or single state, returned to start menu for user ${ctx.chat.id}`
			);
		}
		await ctx.answerCallbackQuery();
	} else {
		await handleSpecificCallback(ctx);
	}
};

module.exports = { handleCallbackQuery };
