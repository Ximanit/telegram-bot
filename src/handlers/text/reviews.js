const {
	createStartKeyboard,
	createBackKeyboard,
	createReviewModerationKeyboard,
} = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { addReview } = require('../../services/reviews');

const validateReview = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 10 ? trimmed : null;
};

const handleReviewText = async (ctx) => {
	const reviewText = validateReview(ctx.message.text);
	if (!reviewText) {
		const sentMessage = await ctx.reply(MESSAGES.reviewTooShort, {
			parse_mode: 'Markdown',
			reply_markup: createBackKeyboard(),
		});
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		return;
	}

	const review = await addReview(ctx.from.id, ctx.from.username, reviewText);

	await ctx.api.sendMessage(
		process.env.ADMIN_ID,
		MESSAGES.reviewReceived
			.replace('%username', ctx.from.username || `ID ${ctx.from.id}`)
			.replace('%text', reviewText),
		{
			parse_mode: 'Markdown',
			reply_markup: createReviewModerationKeyboard(review._id.toString()),
		}
	);

	ctx.session.awaitingReview = false;
	ctx.session.lastAction = null;
	const sentMessage = await ctx.reply(MESSAGES.reviewSent, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
	ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
};

module.exports = { handleReviewText };
