const { createBackKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { editMessage } = require('../utils');
const { getReviews, updateReviewStatus } = require('../../services/reviews');

const callbackHandlers = {
	show_reviews: {
		text: async (ctx) => {
			const reviews = await getReviews();
			const approvedReviews = reviews.filter((r) => r.approved);
			return approvedReviews.length
				? `${MESSAGES.reviewsHeader}\n${approvedReviews
						.map((r) => `- ${r.text} (@${r.username})`)
						.join('\n')}`
				: MESSAGES.noReviews;
		},
		keyboard: createBackKeyboard,
	},
	add_review: {
		text: MESSAGES.addReviewPrompt,
		keyboard: createBackKeyboard,
		onExecute: (ctx) => {
			ctx.session.awaitingReview = true;
		},
	},
	approve_review: async (ctx) => {
		const reviewId = parseInt(ctx.callbackQuery.data.split('_').pop());
		const review = await updateReviewStatus(reviewId, true);
		if (review) {
			await ctx.answerCallbackQuery(MESSAGES.reviewApproved);
			await editMessage(ctx, MESSAGES.reviewsHeader, createBackKeyboard());
		} else {
			await ctx.answerCallbackQuery('Ошибка: отзыв не найден');
		}
	},
	reject_review: async (ctx) => {
		const reviewId = parseInt(ctx.callbackQuery.data.split('_').pop());
		const review = await updateReviewStatus(reviewId, false);
		if (review) {
			await ctx.answerCallbackQuery(MESSAGES.reviewRejected);
			await editMessage(ctx, MESSAGES.reviewsHeader, createBackKeyboard());
		} else {
			await ctx.answerCallbackQuery('Ошибка: отзыв не найден');
		}
	},
};

const handleReviewCallback = async (ctx, action) => {
	const handlerKey = action.startsWith('approve_review_')
		? 'approve_review'
		: action.startsWith('reject_review_')
		? 'reject_review'
		: action;
	const handler = callbackHandlers[handlerKey];
	if (handler) {
		if (typeof handler === 'function') {
			await handler(ctx);
		} else {
			const text =
				typeof handler.text === 'function'
					? await handler.text(ctx)
					: handler.text;
			await editMessage(ctx, text, handler.keyboard());
			if (handler.onExecute) await handler.onExecute(ctx);
		}
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleReviewCallback };
