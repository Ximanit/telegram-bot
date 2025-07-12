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
	skipHistory = false
) => {
	try {
		const chatId = ctx.chat.id;
		const lastMessageId = ctx.session[SESSION_KEYS.LAST_MESSAGE_ID]?.[chatId];
		logger.info(
			`Attempting to send/edit message for chat ${chatId}, lastMessageId: ${lastMessageId}, forceNew: ${forceNew}`
		);

		let sentMessage;
		if (lastMessageId && !forceNew) {
			try {
				sentMessage = await ctx.api.editMessageText(
					chatId,
					lastMessageId,
					text,
					{
						parse_mode: 'Markdown',
						reply_markup: keyboard,
					}
				);
				logger.info(`Edited message ${lastMessageId} in chat ${chatId}`);
			} catch (error) {
				logger.warn(
					`Failed to edit message ${lastMessageId} in chat ${chatId}: ${error.message}`
				);
				sentMessage = await ctx.api.sendMessage(chatId, text, {
					parse_mode: 'Markdown',
					reply_markup: keyboard,
				});
				ctx.session[SESSION_KEYS.LAST_MESSAGE_ID] =
					ctx.session[SESSION_KEYS.LAST_MESSAGE_ID] || {};
				ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][chatId] =
					sentMessage.message_id;
				logger.info(
					`Sent new message ${sentMessage.message_id} in chat ${chatId} due to edit failure`
				);
			}
		} else {
			sentMessage = await ctx.api.sendMessage(chatId, text, {
				parse_mode: 'Markdown',
				reply_markup: keyboard,
			});
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID] =
				ctx.session[SESSION_KEYS.LAST_MESSAGE_ID] || {};
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][chatId] =
				sentMessage.message_id;
			logger.info(
				`Sent new message ${sentMessage.message_id} in chat ${chatId}${
					forceNew ? ' (forced new)' : ''
				}`
			);
		}

		if (!skipHistory) {
			ctx.session[SESSION_KEYS.HISTORY] =
				ctx.session[SESSION_KEYS.HISTORY] || [];
			ctx.session[SESSION_KEYS.HISTORY].push({ text, keyboard });
			logger.info(
				`Updated history for chat ${chatId}: ${JSON.stringify(
					ctx.session[SESSION_KEYS.HISTORY]
				)}`
			);
		}
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
	await updateLastMessageId(userId, userId, sentMessage.message_id);
};

module.exports = {
	sendOrEditMessage,
	sendMeow,
	handleError,
	sendMessageToUser,
};
