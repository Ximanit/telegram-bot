const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { handleReviewText } = require('./reviews');
const { handleQuestionText } = require('./questions');
const { handleSupportQuestionText } = require('./support');
const { sendMeow } = require('../utils');

const handleText = async (ctx) => {
	if (ctx.message.text === 'Мяу') {
		await sendMeow(ctx);
		return;
	}

	if (ctx.session[SESSION_KEYS.AWAITING_REVIEW]) {
		return handleReviewText(ctx);
	}

	if (
		ctx.session[SESSION_KEYS.AWAITING_QUESTION] ||
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID]
	) {
		return handleQuestionText(ctx);
	}

	if (
		ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION] ||
		ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID]
	) {
		return handleSupportQuestionText(ctx);
	}

	const sentMessage = await ctx.reply(MESSAGES.unknownMessage, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
	});
	ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
		sentMessage.message_id;
};

module.exports = { handleText };
