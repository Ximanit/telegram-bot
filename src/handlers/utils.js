const { createStartKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

const handleError = async (err, ctx) => {
	const updateId = ctx?.update?.update_id ?? 'unknown';
	console.error(`Error for update ${updateId}:`, err);
	if (ctx?.chat) {
		try {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				MESSAGES.error,
				{
					parse_mode: 'Markdown',
					reply_markup: createStartKeyboard(ctx.session.questionCount),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			if (ctx.callbackQuery) {
				await ctx.answerCallbackQuery({ text: MESSAGES.errorCallback });
			}
		} catch (replyError) {
			console.error('Ошибка при отправке сообщения об ошибке:', replyError);
		}
	}
};

const sendOrEditMessage = async (
	ctx,
	text,
	keyboard,
	forceNew = false,
	skipHistory = false
) => {
	try {
		if (!text || typeof text !== 'string') {
			throw new Error('Текст сообщения пустой или некорректный');
		}

		const chatId = ctx.chat?.id;
		if (!chatId) {
			throw new Error('Chat ID не найден');
		}

		// Отладка: логируем текущее состояние истории
		console.log(
			`[sendOrEditMessage] Chat ${chatId}, History before:`,
			JSON.stringify(ctx.session.history)
		);

		// Сохраняем текущее состояние в историю, если это не действие "Назад" и не указано skipHistory
		if (!skipHistory && !ctx.callbackQuery?.data?.startsWith('back')) {
			const lastHistoryEntry =
				ctx.session.history[ctx.session.history.length - 1];
			// Проверяем, чтобы не добавлять дубликат текущего состояния
			if (!lastHistoryEntry || lastHistoryEntry.text !== text) {
				ctx.session.history.push({
					text,
					keyboard,
				});
				console.log(`[sendOrEditMessage] Добавлено в историю: ${text}`);
			} else {
				console.log(
					`[sendOrEditMessage] Пропущено добавление в историю (дубликат): ${text}`
				);
			}
			// Ограничиваем глубину истории до 5 записей
			ctx.session.history = ctx.session.history.slice(-5);
		}

		// Если forceNew или нет lastMessageId, отправляем новое сообщение
		if (forceNew || !ctx.session.lastMessageId[chatId]) {
			const sentMessage = await ctx.api.sendMessage(chatId, text, {
				parse_mode: 'Markdown',
				reply_markup: keyboard,
			});
			ctx.session.lastMessageId[chatId] = sentMessage.message_id;
			console.log(
				`[sendOrEditMessage] Отправлено новое сообщение: ${text}, message_id: ${sentMessage.message_id}`
			);
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
			console.log(
				`[sendOrEditMessage] Отредактировано сообщение: ${text}, message_id: ${ctx.session.lastMessageId[chatId]}`
			);
			if (ctx.callbackQuery) await ctx.answerCallbackQuery();
		} catch (error) {
			console.warn(
				`[sendOrEditMessage] Ошибка редактирования сообщения ${ctx.session.lastMessageId[chatId]}: ${error.description}`
			);
			if (
				error.description?.includes('message is not modified') ||
				error.description?.includes('message to edit not found') ||
				error.description?.includes('bad request')
			) {
				const sentMessage = await ctx.api.sendMessage(chatId, text, {
					parse_mode: 'Markdown',
					reply_markup: keyboard,
				});
				ctx.session.lastMessageId[chatId] = sentMessage.message_id;
				console.log(
					`[sendOrEditMessage] Редактирование не удалось, отправлено новое сообщение: ${text}, message_id: ${sentMessage.message_id}`
				);
			} else {
				throw error;
			}
		}

		// Отладка: логируем историю после обработки
		console.log(
			`[sendOrEditMessage] Chat ${chatId}, History after:`,
			JSON.stringify(ctx.session.history)
		);
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
