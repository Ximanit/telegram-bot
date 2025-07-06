const { handleCartCallback } = require('./cart');
const { handleNavigationCallback } = require('./navigation');
const { handleReviewCallback } = require('./reviews');
const { handleQuestionCallback } = require('./questions');
const { handleSupportQuestionCallback } = require('./support');

const handleCallbackQuery = async (ctx) => {
	const action = ctx.callbackQuery.data;

	if (
		action.startsWith('add_to_cart_') ||
		action.startsWith('increase_quantity_') ||
		action.startsWith('decrease_quantity_') ||
		action === 'clear_cart' ||
		action === 'confirm_clear_cart' ||
		action === 'pay_cart' ||
		action === 'view_cart' ||
		action.startsWith('confirm_payment_') ||
		action.startsWith('reject_payment_')
	) {
		return handleCartCallback(ctx, action);
	}

	if (
		action.startsWith('approve_review_') ||
		action.startsWith('reject_review_') ||
		action === 'show_reviews' ||
		action === 'add_review'
	) {
		return handleReviewCallback(ctx, action);
	}

	if (
		action === 'back_to_menu' ||
		action === 'back_to_price' ||
		action === 'show_terms' ||
		action === 'show_price'
	) {
		return handleNavigationCallback(ctx, action);
	}

	if (
		action.startsWith('answer_question_') ||
		action.startsWith('reject_question_') ||
		action.startsWith('close_question_') ||
		action.startsWith('clarify_question_')
	) {
		return handleQuestionCallback(ctx, action);
	}

	if (
		action.startsWith('answer_support_question_') ||
		action.startsWith('close_support_question_') ||
		action.startsWith('clarify_support_question_')
	) {
		return handleSupportQuestionCallback(ctx, action);
	}

	if (action === 'noop') {
		return ctx.answerCallbackQuery();
	}

	await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
};

module.exports = { handleCallbackQuery };
