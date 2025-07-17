const {
	createBackCartKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createStartKeyboard,
	createConfirmClearCartKeyboard,
} = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');
const { cartUtils } = require('../utils/cart');
const {
	addToCart,
	increaseQuantity,
	decreaseQuantity,
} = require('../../services/cart');
const { addPayment, updatePaymentStatus } = require('../../services/payments');
const { getUserSession, updateSession } = require('../../db');

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
		await sendOrEditMessage(
			ctx,
			cartUtils.format(ctx.session[SESSION_KEYS.CART]),
			createCartKeyboard(ctx.session[SESSION_KEYS.CART])
		);
		await ctx.answerCallbackQuery();
	} else if (action === 'clear_cart') {
		if (!ctx.session[SESSION_KEYS.CART].length) {
			await ctx.answerCallbackQuery(MESSAGES.cartEmptyWarning);
			return;
		}
		await sendOrEditMessage(
			ctx,
			MESSAGES.confirmClearCart,
			createConfirmClearCartKeyboard()
		);
	} else if (action === 'confirm_clear_cart') {
		ctx.session[SESSION_KEYS.CART] = [];
		await ctx.answerCallbackQuery(MESSAGES.cartCleared);
		await sendOrEditMessage(ctx, MESSAGES.cartEmpty, createBackKeyboard());
	} else if (action === 'pay_cart') {
		if (!ctx.session[SESSION_KEYS.CART].length) {
			await ctx.answerCallbackQuery(MESSAGES.cartEmptyWarning);
			return;
		}
		const { total } = cartUtils.summary(ctx.session[SESSION_KEYS.CART]);
		const payment = await addPayment(
			ctx.from.id,
			ctx.from.username,
			ctx.session[SESSION_KEYS.CART],
			total
		);
		ctx.session[SESSION_KEYS.PAYMENT_ID] = payment._id.toString();
		ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO] = true;

		await sendOrEditMessage(
			ctx,
			MESSAGES.paymentInstructions.replace('%total', total),
			createBackCartKeyboard(ctx.session[SESSION_KEYS.CART])
		);
		await ctx.answerCallbackQuery();
	} else if (action.startsWith('confirm_payment_')) {
		const paymentId = action.replace('confirm_payment_', '');
		const payment = await updatePaymentStatus(paymentId, 'confirmed');
		if (payment) {
			const questionCount = payment.questionCount;
			const userSession = await getUserSession(payment.userId, ctx);
			if (!userSession) return;
			const updatedSessionData = {
				paidServices: payment.cart.flatMap((item) =>
					Array(item.quantity).fill({
						name: item.name,
						price: item.price,
						id: item.id,
					})
				),
				hasPaid: true,
				questionCount: userSession.value.questionCount + questionCount, // Накопление вопросов
				awaitingQuestion: userSession.value.questionCount + questionCount > 0,
				cart: [],
			};
			await updateSession(payment.userId, updatedSessionData);
			await sendMessageToUser(
				payment.userId,
				`${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					payment.total
				)}\nУ вас доступно вопросов: ${updatedSessionData.questionCount}`,
				createStartKeyboard(updatedSessionData.questionCount),
				ctx
			);
			await sendOrEditMessage(
				ctx,
				'Платеж подтвержден',
				createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
			);
			ctx.session[SESSION_KEYS.CART] = [];
			await ctx.answerCallbackQuery('Платеж подтвержден');
		} else {
			await sendOrEditMessage(
				ctx,
				'Ошибка: платеж не найден.',
				createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
			);
			await ctx.answerCallbackQuery('Ошибка: платеж не найден');
		}
	} else if (action.startsWith('reject_payment_')) {
		const paymentId = action.replace('reject_payment_', '');
		const payment = await updatePaymentStatus(paymentId, 'rejected');
		if (!payment) {
			await sendOrEditMessage(
				ctx,
				'Ошибка: платеж не найден.',
				createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
			);
			await ctx.answerCallbackQuery('Ошибка: платеж не найден');
			return;
		}
		ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON] = true;
		ctx.session[SESSION_KEYS.PAYMENT_ID] = paymentId;
		await sendOrEditMessage(
			ctx,
			MESSAGES.rejectPaymentReasonPrompt,
			createBackKeyboard()
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleCartCallback };
