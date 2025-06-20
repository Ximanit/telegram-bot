const { createStartKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

// Обработка ошибок
const handleError = async (ctx, error, defaultMessage = MESSAGES.error) => {
	console.error('Ошибка:', error);
	try {
		await ctx.reply(defaultMessage, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
		if (ctx.callbackQuery) {
			await ctx.answerCallbackQuery({ text: MESSAGES.errorCallback });
		}
	} catch (replyError) {
		console.error('Ошибка при отправке сообщения об ошибке:', replyError);
	}
};

// Редактирование сообщения
const editMessage = async (ctx, text, keyboard) => {
	console.log('Попытка редактирования сообщения:', { text, keyboard }); // Отладка
	try {
		if (!text || typeof text !== 'string') {
			throw new Error('Текст сообщения пустой или некорректный');
		}
		await ctx.editMessageText(text, {
			parse_mode: 'Markdown',
			reply_markup: keyboard,
		});
		console.log('Сообщение успешно отредактировано:', text); // Отладка
		await ctx.answerCallbackQuery();
	} catch (error) {
		console.error('Ошибка редактирования сообщения:', error);
		if (error.description?.includes('message is not modified')) {
			console.log('Сообщение не изменилось, пропускаем');
			await ctx.answerCallbackQuery();
		} else if (
			error.description?.includes('Bad Request: message to edit not found')
		) {
			// Если сообщение не найдено, отправляем новое
			try {
				await ctx.reply(text, {
					parse_mode: 'Markdown',
					reply_markup: keyboard,
				});
				console.log('Отправлено новое сообщение вместо редактирования:', text);
				await ctx.answerCallbackQuery();
			} catch (replyError) {
				console.error('Ошибка отправки нового сообщения:', replyError);
				await handleError(ctx, replyError);
			}
		} else {
			await handleError(ctx, error);
		}
	}
};

// Утилиты для корзины
const cartUtils = {
	summary: (cart) => ({
		count: cart.reduce((sum, item) => sum + item.quantity, 0),
		total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
	}),
	format: (cart) => {
		if (!cart.length) return MESSAGES.cartEmpty;
		const items = cart
			.map(
				(item, i) =>
					`${i + 1}. ${item.name} — ${item.price} руб. (x${item.quantity})`
			)
			.join('\n');
		const { total } = cartUtils.summary(cart);
		return MESSAGES.cartContent
			.replace('%items', items)
			.replace('%total', total);
	},
};

module.exports = { handleError, editMessage, cartUtils };
