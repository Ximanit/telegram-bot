const { createStartKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

const handleError = async (err, ctx) => {
	const updateId = ctx?.update?.update_id ?? 'unknown';
	console.error(`Error for update ${updateId}:`, err);
	if (ctx?.chat) {
		try {
			await ctx.reply(MESSAGES.error, {
				parse_mode: 'Markdown',
				reply_markup: createStartKeyboard(ctx.session.questionCount),
			});
			if (ctx.callbackQuery) {
				await ctx.answerCallbackQuery({ text: MESSAGES.errorCallback });
			}
		} catch (replyError) {
			console.error('Ошибка при отправке сообщения об ошибке:', replyError);
		}
	}
};

const editMessage = async (ctx, text, keyboard) => {
	try {
		if (!text || typeof text !== 'string') {
			throw new Error('Текст сообщения пустой или некорректный');
		}

		// Проверяем, есть ли lastMessageId в сессии и можно ли редактировать сообщение
		if (ctx.session.lastMessageId && ctx.chat) {
			try {
				await ctx.api.editMessageText(
					ctx.chat.id,
					ctx.session.lastMessageId,
					text,
					{
						parse_mode: 'Markdown',
						reply_markup: keyboard,
					}
				);
				if (ctx.callbackQuery) await ctx.answerCallbackQuery();
				return;
			} catch (error) {
				if (
					error.description?.includes('message is not modified') ||
					error.description?.includes('message to edit not found')
				) {
					// Если редактирование невозможно, отправляем новое сообщение
				} else {
					throw error; // Пробрасываем другие ошибки
				}
			}
		}

		// Отправляем новое сообщение и сохраняем его ID
		const sentMessage = await ctx.reply(text, {
			parse_mode: 'Markdown',
			reply_markup: keyboard,
		});
		ctx.session.lastMessageId = sentMessage.message_id; // Сохраняем ID нового сообщения
		if (ctx.callbackQuery) await ctx.answerCallbackQuery();
	} catch (error) {
		await handleError(error, ctx);
	}
};

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
