const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage } = require('../utils');
const {
	createPriceKeyboard,
	createBackKeyboard,
	createStartKeyboard,
} = require('../../keyboards');

const handleNavigationCallback = async (ctx, action) => {
	if (action === 'show_terms') {
		await sendOrEditMessage(
			ctx,
			MESSAGES.terms,
			createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
		);
		await ctx.answerCallbackQuery();
	} else if (action === 'show_price') {
		await sendOrEditMessage(ctx, MESSAGES.price, createPriceKeyboard());
		await ctx.answerCallbackQuery();
	} else if (action === 'back_to_menu') {
		await sendOrEditMessage(
			ctx,
			MESSAGES.start.replace('%s', ctx.from?.first_name || 'Друг'),
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
		);
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleNavigationCallback };
