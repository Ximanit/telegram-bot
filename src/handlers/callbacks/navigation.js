const {
	createStartKeyboard,
	createPriceKeyboard,
	createBackKeyboard,
} = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { editMessage, cartUtils } = require('../utils');

const callbackHandlers = {
	back_to_menu: {
		text: (ctx) => MESSAGES.start.replace('%s', ctx.from?.first_name || 'Друг'),
		keyboard: createStartKeyboard,
	},
	back_to_price: {
		text: (ctx) =>
			MESSAGES.cartSummary
				.replace('%count', cartUtils.summary(ctx.session.cart).count)
				.replace('%total', cartUtils.summary(ctx.session.cart).total),
		keyboard: createPriceKeyboard,
	},
	show_terms: {
		text: MESSAGES.terms,
		keyboard: createBackKeyboard,
	},
	show_price: {
		text: (ctx) =>
			MESSAGES.cartSummary
				.replace('%count', cartUtils.summary(ctx.session.cart).count)
				.replace('%total', cartUtils.summary(ctx.session.cart).total),
		keyboard: createPriceKeyboard,
	},
};

const handleNavigationCallback = async (ctx, action) => {
	const handler = callbackHandlers[action];
	if (handler) {
		const text =
			typeof handler.text === 'function' ? handler.text(ctx) : handler.text;
		await editMessage(ctx, text, handler.keyboard(ctx.session.questionCount));
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleNavigationCallback };
