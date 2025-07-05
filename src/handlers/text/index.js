// src/handlers/text/index.js
const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { handleReviewText } = require('./reviews');
const { handleQuestionText } = require('./questions');
const { editMessage } = require('../utils');

const handleText = async (ctx) => {
	if (ctx.message.text === 'Мяу') {
		return editMessage(ctx, MESSAGES.meow, createStartKeyboard());
	}

	if (ctx.session.awaitingReview) {
		return handleReviewText(ctx);
	}

	if (ctx.session.awaitingQuestion || ctx.session.currentQuestionId) {
		return handleQuestionText(ctx);
	}

	return editMessage(ctx, MESSAGES.unknownMessage, createStartKeyboard());
};

module.exports = { handleText };
