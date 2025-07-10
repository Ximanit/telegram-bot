const {
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createStartKeyboard,
	createConfirmClearCartKeyboard,
} = require('../../keyboards');
const { MESSAGES, SERVICES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage, cartUtils } = require('../utils');
const {
	addToCart,
	increaseQuantity,
	decreaseQuantity,
} = require('../../services/cart');
const { addPayment, updatePaymentStatus } = require('../../services/payments');
const { connectDB } = require('../../db');
const logger = require('../../logger');

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
		await sendOrEditMessage(
			ctx,
			MESSAGES.cartEmpty,
			createCartKeyboard(ctx.session[SESSION_KEYS.CART])
		);
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
			`Пожалуйста, оплатите ${total} руб. по следующим реквизитам:\n\n` +
				`Карта: 1234 5678 9012 3456\n` +
				`Получатель: Имя Фамилия\n\n` +
				`После оплаты загрузите фото чека.`,
			createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
		);
		await ctx.answerCallbackQuery();
	} else if (action.startsWith('confirm_payment_')) {
		const paymentId = action.replace('confirm_payment_', '');
		const payment = await updatePaymentStatus(paymentId, 'confirmed');
		if (payment) {
			const questionCount = payment.questionCount;
			const db = await connectDB();
			const sessions = db.collection('sessions');
			const userSession = await sessions.findOne({
				key: payment.userId.toString(),
			});
			if (!userSession) {
				logger.error(`Session for user ${payment.userId} not found`);
				await sendOrEditMessage(
					ctx,
					'Ошибка: сессия пользователя не найдена.',
					createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
				);
				await ctx.answerCallbackQuery('Ошибка: сессия пользователя не найдена');
				return;
			}
			const updatedSessionData = {
				paidServices: payment.cart.flatMap((item) =>
					Array(item.quantity).fill({
						name: item.name,
						price: item.price,
						id: item.id,
					})
				),
				hasPaid: true,
				questionCount,
				awaitingQuestion: questionCount > 0,
				cart: [],
			};
			await updateSession(payment.userId, updatedSessionData);
			const userCtx = {
				chat: { id: payment.userId },
				session: { ...userSession.value, ...updatedSessionData },
				api: ctx.api,
				answerCallbackQuery: () => {},
			};
			const sentMessage = await sendOrEditMessage(
				userCtx,
				`${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					payment.total
				)}\nУ вас доступно вопросов: ${questionCount}`,
				createStartKeyboard(questionCount)
			);
			await updateSession(payment.userId, {
				lastMessageId: { [payment.userId]: sentMessage.message_id },
			});
			await sendOrEditMessage(
				ctx,
				'Платеж подтвержден',
				createBackKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT])
			);
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
