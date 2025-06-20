const {
	createStartKeyboard,
	createPriceKeyboard,
	createBackKeyboard,
} = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { editMessage, cartUtils } = require('../utils');

const createCallbackHandler =
	(getText, getKeyboard, onExecute) => async (ctx, userName) => {
		try {
			const text =
				typeof getText === 'function' ? await getText(ctx, userName) : getText;
			if (!text) {
				console.error('Текст для callback пустой');
				await ctx.answerCallbackQuery('Ошибка: нет текста для отображения');
				return;
			}
			const keyboard = getKeyboard(ctx);
			await editMessage(ctx, text, keyboard);
			if (onExecute) await onExecute(ctx);
		} catch (error) {
			console.error('Ошибка в createCallbackHandler:', error);
			await ctx.answerCallbackQuery('Ошибка при обработке запроса');
		}
	};

const callbackHandlers = {
	back_to_menu: createCallbackHandler(
		(_, userName) => MESSAGES.start.replace('%s', userName),
		() => createStartKeyboard()
	),
	back_to_price: createCallbackHandler(
		(ctx) =>
			MESSAGES.cartSummary
				.replace('%count', cartUtils.summary(ctx.session.cart).count)
				.replace('%total', cartUtils.summary(ctx.session.cart).total),
		() => createPriceKeyboard()
	),
	show_terms: createCallbackHandler(MESSAGES.terms, () => createBackKeyboard()),
	show_price: createCallbackHandler(
		(ctx) =>
			MESSAGES.cartSummary
				.replace('%count', cartUtils.summary(ctx.session.cart).count)
				.replace('%total', cartUtils.summary(ctx.session.cart).total),
		() => createPriceKeyboard()
	),
};

const handleNavigationCallback = async (ctx, action, userName) => {
	const handler = callbackHandlers[action];
	if (handler) {
		await handler(ctx, userName);
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleNavigationCallback };
