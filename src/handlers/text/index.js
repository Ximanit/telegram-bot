const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { handleReviewText } = require('./reviews');
const { handleQuestionText } = require('./questions');

const handleText = async (ctx) => {
	if (ctx.message.text === 'Мяу') {
		return ctx.reply(MESSAGES.meow, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
	}

	if (ctx.session.awaitingReview) {
		return handleReviewText(ctx);
	}

	if (ctx.session.awaitingQuestion) {
		return handleQuestionText(ctx);
	}

	return ctx.reply(MESSAGES.unknownMessage, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

module.exports = { handleText };
