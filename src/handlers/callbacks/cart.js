const {
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createStartKeyboard,
	InlineKeyboard,
} = require('../../keyboards');
const { MESSAGES, SERVICES } = require('../../constants');
const { editMessage, cartUtils } = require('../utils');
const {
	addToCart,
	increaseQuantity,
	decreaseQuantity,
} = require('../../services/cart');

const handleCartCallback = async (ctx, action, userName) => {
	if (action.startsWith('add_to_cart_')) {
		const serviceId = action.replace('add_to_cart_', '');
		await addToCart(ctx, serviceId);
	} else if (action.startsWith('increase_quantity_')) {
		const serviceId = action.replace('increase_quantity_', '');
		await increaseQuantity(ctx, serviceId);
	} else if (action.startsWith('decrease_quantity_')) {
		const serviceId = action.replace('decrease_quantity_', '');
		await decreaseQuantity(ctx, serviceId);
	} else if (action === 'view_cart') {
		await editMessage(
			ctx,
			cartUtils.format(ctx.session.cart),
			createCartKeyboard(ctx.session.cart)
		);
		await ctx.answerCallbackQuery();
	} else if (action === 'clear_cart') {
		if (!ctx.session.cart.length) {
			await ctx.answerCallbackQuery(MESSAGES.cartEmptyWarning);
			return;
		}
		await editMessage(
			ctx,
			MESSAGES.confirmClearCart,
			new InlineKeyboard()
				.text('Да, очистить', 'confirm_clear_cart')
				.text('Отмена', 'view_cart')
		);
	} else if (action === 'confirm_clear_cart') {
		ctx.session.cart = [];
		await ctx.answerCallbackQuery(MESSAGES.cartCleared);
		await editMessage(
			ctx,
			MESSAGES.cartEmpty,
			createCartKeyboard(ctx.session.cart)
		);
	} else if (action === 'pay_cart') {
		if (!ctx.session.cart.length) {
			await ctx.answerCallbackQuery(MESSAGES.cartEmptyWarning);
			return;
		}
		const { total } = cartUtils.summary(ctx.session.cart);
		ctx.session.paidServices = ctx.session.cart.flatMap((item) =>
			Array(item.quantity).fill({
				name: item.name,
				price: item.price,
				id: item.id,
			})
		);
		ctx.session.hasPaid = true;
		ctx.session.questionCount = 0;
		ctx.session.lastAction = null;
		const hasSingleQuestion = ctx.session.cart.some(
			(s) => s.id === 'single_question'
		);
		ctx.session.cart = [];
		const text = hasSingleQuestion
			? `${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					total
			  )}\n\n${MESSAGES.askQuestion}`
			: `${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					total
			  )}\n\n${MESSAGES.paymentNoQuestions}`;
		ctx.session.awaitingQuestion = hasSingleQuestion;
		await editMessage(
			ctx,
			text,
			hasSingleQuestion ? createBackKeyboard() : createStartKeyboard()
		);
		await ctx.answerCallbackQuery('Оплата подтверждена');
	}
};

module.exports = { handleCartCallback };
