const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { handleReviewText } = require('./reviews');
const { handleQuestionText } = require('./questions');
const { handleSupportQuestionText } = require('./support');
const { sendMeow } = require('../utils');

const handleText = async (ctx) => {
	if (ctx.message.text === 'Мяу') {
		await sendMeow(ctx);
		return;
	}

	if (ctx.session.awaitingReview) {
		return handleReviewText(ctx);
	}

	if (ctx.session.awaitingQuestion || ctx.session.currentQuestionId) {
		return handleQuestionText(ctx);
	}

	if (
		ctx.session.awaitingSupportQuestion ||
		ctx.session.currentSupportQuestionId
	) {
		return handleSupportQuestionText(ctx);
	}

	const sentMessage = await ctx.reply(MESSAGES.unknownMessage, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(ctx.session.questionCount),
	});
	ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
};

module.exports = { handleText };
