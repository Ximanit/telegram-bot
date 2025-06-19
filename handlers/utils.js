const { createStartKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

// Обработка ошибок
const handleError = async (ctx, error, defaultMessage = MESSAGES.error) => {
	console.error('Ошибка:', error);
	await ctx.reply(defaultMessage, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
	if (ctx.callbackQuery)
		await ctx.answerCallbackQuery({ text: MESSAGES.errorCallback });
};

// Редактирование сообщения
const editMessage = async (ctx, text, keyboard) => {
	try {
		await ctx.editMessageText(text, {
			parse_mode: 'Markdown',
			reply_markup: keyboard,
		});
		await ctx.answerCallbackQuery();
	} catch (error) {
		if (!error.description.includes('message is not modified')) {
			await handleError(ctx, error);
		} else {
			await ctx.answerCallbackQuery();
		}
	}
};

// Утилиты для корзины
const cartUtils = {
	summary: (cart) => ({
		count: cart.length,
		total: cart.reduce((sum, item) => sum + item.price, 0),
	}),
	format: (cart) => {
		if (!cart.length) return MESSAGES.cartEmpty;
		const items = cart
			.map((item, i) => `${i + 1}. ${item.name} — ${item.price} руб.`)
			.join('\n');
		const { total } = cartUtils.summary(cart);
		return MESSAGES.cartContent
			.replace('%items', items)
			.replace('%total', total);
	},
};

module.exports = { handleError, editMessage, cartUtils };
