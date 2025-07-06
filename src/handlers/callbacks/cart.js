const {
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createStartKeyboard,
	InlineKeyboard,
} = require('../../keyboards');
const { MESSAGES, SERVICES } = require('../../constants');
const { sendOrEditMessage, cartUtils } = require('../utils');
const {
	addToCart,
	increaseQuantity,
	decreaseQuantity,
} = require('../../services/cart');
const { addPayment, updatePaymentStatus } = require('../../services/payments');
const { FileAdapter } = require('@grammyjs/storage-file');

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
			cartUtils.format(ctx.session.cart),
			createCartKeyboard(ctx.session.cart)
		);
		await ctx.answerCallbackQuery();
	} else if (action === 'clear_cart') {
		if (!ctx.session.cart.length) {
			await ctx.answerCallbackQuery(MESSAGES.cartEmptyWarning);
			return;
		}
		await sendOrEditMessage(
			ctx,
			MESSAGES.confirmClearCart,
			new InlineKeyboard()
				.text('Да, очистить', 'confirm_clear_cart')
				.text('Назад', 'back')
		);
	} else if (action === 'confirm_clear_cart') {
		ctx.session.cart = [];
		await ctx.answerCallbackQuery(MESSAGES.cartCleared);
		await sendOrEditMessage(
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
		const payment = await addPayment(
			ctx.from.id,
			ctx.from.username,
			ctx.session.cart,
			total
		);
		ctx.session.paymentId = payment.id;
		ctx.session.awaitingPaymentPhoto = true;
		await sendOrEditMessage(
			ctx,
			`Пожалуйста, оплатите ${total} руб. по следующим реквизитам:\n\n` +
				`Карта: 1234 5678 9012 3456\n` +
				`Получатель: Имя Фамилия\n\n` +
				`После оплаты загрузите фото чека.`,
			createBackKeyboard(ctx.session.questionCount)
		);
		await ctx.answerCallbackQuery();
	} else if (action.startsWith('confirm_payment_')) {
		const paymentId = parseInt(action.replace('confirm_payment_', ''));
		const payment = await updatePaymentStatus(paymentId, 'confirmed');
		if (payment) {
			const questionCount = payment.questionCount;

			const storage = new FileAdapter({ dir: './src/data/sessions' });
			const userSession = (await storage.read(payment.userId.toString())) || {
				hasPaid: false,
				awaitingQuestion: false,
				awaitingReview: false,
				awaitingPaymentPhoto: false,
				awaitingAnswer: false,
				awaitingRejectReason: false,
				awaitingRejectPaymentReason: false,
				currentQuestionId: null,
				cart: [],
				paidServices: [],
				questionCount: 0,
				paymentId: null,
				lastMessageId: {},
				history: [],
			};

			userSession.paidServices = payment.cart.flatMap((item) =>
				Array(item.quantity).fill({
					name: item.name,
					price: item.price,
					id: item.id,
				})
			);
			userSession.hasPaid = true;
			userSession.questionCount = questionCount;
			userSession.awaitingQuestion = questionCount > 0;
			userSession.cart = [];

			const userCtx = {
				chat: { id: payment.userId },
				session: userSession,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			await sendOrEditMessage(
				userCtx,
				`${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					payment.total
				)}\nУ вас доступно вопросов: ${questionCount}`,
				createStartKeyboard(questionCount)
			);

			await storage.write(payment.userId.toString(), userSession);

			await sendOrEditMessage(
				ctx,
				'Платеж подтвержден',
				createBackKeyboard(ctx.session.questionCount)
			);
			await ctx.answerCallbackQuery('Платеж подтвержден');
		} else {
			await ctx.answerCallbackQuery('Ошибка: платеж не найден');
		}
	} else if (action.startsWith('reject_payment_')) {
		const paymentId = parseInt(action.replace('reject_payment_', ''));
		ctx.session.awaitingRejectPaymentReason = true;
		ctx.session.paymentId = paymentId;
		await sendOrEditMessage(
			ctx,
			MESSAGES.rejectPaymentReasonPrompt,
			createBackKeyboard()
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleCartCallback };
