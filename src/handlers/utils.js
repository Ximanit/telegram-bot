const logger = require('../logger');
const { SESSION_KEYS, MESSAGES } = require('../constants');
const { getUserSession, updateLastMessageId } = require('../db');

const handleError = async (err, ctx, additionalInfo = {}) => {
	const updateId = ctx?.update?.update_id ?? 'unknown';
	logger.error('Произошла ошибка', {
		updateId,
		error: err.message,
		stack: err.stack,
		userId: ctx?.from?.id,
		chatId: ctx?.chat?.id,
		...additionalInfo,
	});
	if (ctx?.chat) {
		try {
			await sendOrEditMessage(
				ctx,
				MESSAGES.error,
				createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
				true
			);
			if (ctx.callbackQuery) {
				await ctx.answerCallbackQuery({ text: MESSAGES.errorCallback });
			}
		} catch (replyError) {
			logger.error('Ошибка при отправке сообщения об ошибке', {
				error: replyError.message,
				stack: replyError.stack,
			});
		}
	}
};

const sendOrEditMessage = async (
	ctx,
	text,
	keyboard,
	forceNew = false,
	options = {}
) => {
	try {
		const chatId = ctx.chat.id;
		const lastMessageId = ctx.session[SESSION_KEYS.LAST_MESSAGE_ID]?.[chatId];
		logger.info(
			`Attempting to send/delete message for chat ${chatId}, lastMessageId: ${lastMessageId}, forceNew: ${forceNew}`
		);

		let sentMessage;
		if (lastMessageId && !forceNew) {
			try {
				await ctx.api.deleteMessage(chatId, lastMessageId);
				logger.info(`Deleted message ${lastMessageId} in chat ${chatId}`);
			} catch (error) {
				logger.warn(
					`Failed to delete message ${lastMessageId} in chat ${chatId}: ${error.message}`
				);
			}
		}

		// Проверяем, есть ли фото в опциях
		if (options.photo) {
			sentMessage = await ctx.api.sendPhoto(chatId, options.photo, {
				caption: text,
				parse_mode: 'Markdown',
				reply_markup: keyboard,
			});
		} else {
			sentMessage = await ctx.api.sendMessage(chatId, text, {
				parse_mode: 'Markdown',
				reply_markup: keyboard,
			});
		}

		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID] =
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID] || {};
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][chatId] = sentMessage.message_id;

		try {
			await updateLastMessageId(ctx.from.id, sentMessage.message_id);
			logger.info(`Saved lastMessageId to MongoDB for user ${ctx.from.id}`);
		} catch (saveError) {
			logger.error(
				`Failed to save lastMessageId to MongoDB: ${saveError.message}`,
				{
					stack: saveError.stack,
				}
			);
		}

		logger.info(
			`Sent new message ${sentMessage.message_id} in chat ${chatId}${
				forceNew ? ' (forced new)' : ''
			}`
		);

		return sentMessage;
	} catch (error) {
		logger.error(
			`Error in sendOrEditMessage for chat ${ctx.chat.id}: ${error.message}`,
			{
				stack: error.stack,
			}
		);
		throw error;
	}
};

const sendMeow = async (ctx) => {
	await sendOrEditMessage(ctx, MESSAGES.meow, createStartKeyboard(), true);
};

const sendMessageToUser = async (userId, text, keyboard, ctx) => {
	const userSession = await getUserSession(userId, ctx);
	if (!userSession) return;
	const userCtx = {
		chat: { id: userId },
		session: userSession.value,
		api: ctx.api,
		answerCallbackQuery: () => {},
	};
	const sentMessage = await sendOrEditMessage(userCtx, text, keyboard);
	await updateLastMessageId(userId, sentMessage.message_id);
};

module.exports = {
	sendOrEditMessage,
	sendMeow,
	handleError,
	sendMessageToUser,
};
