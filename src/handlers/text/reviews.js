const { createStartKeyboard, createBackKeyboard } = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { addReview } = require('../../services/reviews');
const { sendOrEditMessage } = require('../utils');

const validateReview = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 10 ? trimmed : null;
};

const handleReviewText = async (ctx) => {
	const reviewText = validateReview(ctx.message.text);
	if (!reviewText) {
		await sendOrEditMessage(
			ctx,
			MESSAGES.reviewTooShort,
			createBackKeyboard(),
			true
		);
		return;
	}
	await addReview(ctx.from.id, ctx.from.username, reviewText);
	// await ctx.api.sendMessage(
	// 	process.env.ADMIN_ID,
	// 	MESSAGES.reviewReceived
	// 		.replace('%username', ctx.from.username || `ID ${ctx.from.id}`)
	// 		.replace('%text', reviewText),
	// 	{
	// 		parse_mode: 'Markdown',
	// 		reply_markup: createReviewModerationKeyboard(review._id.toString()),
	// 	}
	// );
	ctx.session[SESSION_KEYS.AWAITING_REVIEW] = false;
	ctx.session[SESSION_KEYS.LAST_ACTION] = null;
	await sendOrEditMessage(
		ctx,
		MESSAGES.reviewSent,
		createStartKeyboard(),
		true
	);
};

module.exports = { handleReviewText };
