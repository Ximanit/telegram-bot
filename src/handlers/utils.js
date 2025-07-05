const { createStartKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

const handleError = async (err, ctx) => {
	const updateId = ctx?.update?.update_id ?? 'unknown';
	console.error(`Error for update ${updateId}:`, err);
	if (ctx?.chat) {
		try {
			const sentMessage = await ctx.reply(MESSAGES.error, {
				parse_mode: 'Markdown',
				reply_markup: createStartKeyboard(ctx.session.questionCount),
			});
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			if (ctx.callbackQuery) {
				await ctx.answerCallbackQuery({ text: MESSAGES.errorCallback });
			}
		} catch (replyError) {
			console.error('Ошибка при отправке сообщения об ошибке:', replyError);
		}
	}
};

const sendOrEditMessage = async (ctx, text, keyboard, forceNew = false) => {
	try {
		if (!text || typeof text !== 'string') {
			throw new Error('Текст сообщения пустой или некорректный');
		}

		const chatId = ctx.chat?.id;
		if (!chatId) {
			throw new Error('Chat ID не найден');
		}

		// Если forceNew или нет lastMessageId для этого чата, отправляем новое сообщение
		if (forceNew || !ctx.session.lastMessageId[chatId]) {
			const sentMessage = await ctx.reply(text, {
				parse_mode: 'Markdown',
				reply_markup: keyboard,
			});
			ctx.session.lastMessageId[chatId] = sentMessage.message_id;
			if (ctx.callbackQuery) await ctx.answerCallbackQuery();
			return;
		}

		// Пытаемся редактировать существующее сообщение
		try {
			await ctx.api.editMessageText(
				chatId,
				ctx.session.lastMessageId[chatId],
				text,
				{
					parse_mode: 'Markdown',
					reply_markup: keyboard,
				}
			);
			if (ctx.callbackQuery) await ctx.answerCallbackQuery();
		} catch (error) {
			if (
				error.description?.includes('message is not modified') ||
				error.description?.includes('message to edit not found') ||
				error.description?.includes('bad request')
			) {
				// Если редактирование невозможно, отправляем новое сообщение
				const sentMessage = await ctx.reply(text, {
					parse_mode: 'Markdown',
					reply_markup: keyboard,
				});
				ctx.session.lastMessageId[chatId] = sentMessage.message_id;
			} else {
				throw error;
			}
		}
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

module.exports = { handleError, sendOrEditMessage, cartUtils };
