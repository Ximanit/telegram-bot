const logger = require('../logger');

const sendOrEditMessage = async (
	ctx,
	text,
	keyboard,
	forceNew = false,
	skipHistory = false
) => {
	try {
		const chatId = ctx.chat.id;
		const lastMessageId = ctx.session.lastMessageId?.[chatId];
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
				ctx.session.lastMessageId = ctx.session.lastMessageId || {};
				ctx.session.lastMessageId[chatId] = sentMessage.message_id;
				logger.info(
					`Sent new message ${sentMessage.message_id} in chat ${chatId} due to edit failure`
				);
			}
		} else {
			sentMessage = await ctx.api.sendMessage(chatId, text, {
				parse_mode: 'Markdown',
				reply_markup: keyboard,
			});
			ctx.session.lastMessageId = ctx.session.lastMessageId || {};
			ctx.session.lastMessageId[chatId] = sentMessage.message_id;
			logger.info(
				`Sent new message ${sentMessage.message_id} in chat ${chatId}${
					forceNew ? ' (forced new)' : ''
				}`
			);
		}

		if (!skipHistory) {
			ctx.session.history = ctx.session.history || [];
			ctx.session.history.push({ text, keyboard });
			logger.info(
				`Updated history for chat ${chatId}: ${JSON.stringify(
					ctx.session.history
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

module.exports = { sendOrEditMessag, sendMeow };
