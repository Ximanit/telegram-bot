const logger = require('../logger');
const { SESSION_KEYS, MESSAGES } = require('../constants');

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

module.exports = { sendOrEditMessage, sendMeow, handleError };
