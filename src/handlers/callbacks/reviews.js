const { createBackKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { editMessage } = require('../utils');
const { getReviews, updateReviewStatus } = require('../../services/reviews');

const createCallbackHandler =
	(getText, getKeyboard, onExecute) => async (ctx, userName) => {
		try {
			const text =
				typeof getText === 'function' ? await getText(ctx, userName) : getText;
			if (!text) {
				console.error('Текст для callback пустой');
				await ctx.answerCallbackQuery('Ошибка: нет текста для отображения');
				return;
			}
			const keyboard = getKeyboard(ctx);
			await editMessage(ctx, text, keyboard);
			if (onExecute) await onExecute(ctx);
		} catch (error) {
			console.error('Ошибка в createCallbackHandler:', error);
			await ctx.answerCallbackQuery('Ошибка при обработке запроса');
		}
	};

const callbackHandlers = {
	show_reviews: createCallbackHandler(
		async (ctx) => {
			const reviews = await getReviews();
			console.log('Все отзывы:', reviews);
			const approvedReviews = reviews.filter((r) => r.approved);
			console.log('Одобренные отзывы:', approvedReviews);
			if (!approvedReviews.length) return MESSAGES.noReviews;
			const reviewText = approvedReviews
				.map((r) => `- ${r.text} (@${r.username})`)
				.join('\n');
			console.log('Текст отзывов:', reviewText);
			return `${MESSAGES.reviewsHeader}\n${reviewText}`;
		},
		() => createBackKeyboard()
	),
	add_review: createCallbackHandler(
		MESSAGES.addReviewPrompt,
		() => createBackKeyboard(),
		(ctx) => {
			ctx.session.awaitingReview = true;
			ctx.session.lastAction = 'add_review';
		}
	),
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

const handleReviewCallback = async (ctx, action, userName) => {
	const handlerKey = action.startsWith('approve_review_')
		? 'approve_review'
		: action.startsWith('reject_review_')
		? 'reject_review'
		: action;
	const handler = callbackHandlers[handlerKey];
	if (handler) {
		await handler(ctx, userName);
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleReviewCallback };
