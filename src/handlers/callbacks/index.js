const { handleCartCallback } = require('./cart');
const { handleNavigationCallback } = require('./navigation');
const { handleReviewCallback } = require('./reviews');
const { createBackKeyboard } = require('../../keyboards');

const handleCallbackQuery = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	const action = ctx.callbackQuery.data;

	console.log('Обработка callback:', action);

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
		return handleCartCallback(ctx, action, userName);
	}

	if (
		action.startsWith('approve_review_') ||
		action.startsWith('reject_review_') ||
		action === 'show_reviews' ||
		action === 'add_review'
	) {
		return handleReviewCallback(ctx, action, userName);
	}

	if (
		action === 'back_to_menu' ||
		action === 'back_to_price' ||
		action === 'show_terms' ||
		action === 'show_price'
	) {
		return handleNavigationCallback(ctx, action, userName);
	}

	if (action === 'noop') {
		await ctx.answerCallbackQuery();
		return;
	}

	await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
};

module.exports = { handleCallbackQuery };
