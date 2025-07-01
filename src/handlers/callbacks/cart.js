const {
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createStartKeyboard,
	createPaymentConfirmationKeyboard,
	InlineKeyboard,
} = require('../../keyboards');
const { MESSAGES, SERVICES } = require('../../constants');
const { editMessage, cartUtils } = require('../utils');
const {
	addToCart,
	increaseQuantity,
	decreaseQuantity,
} = require('../../services/cart');
const { addPayment, updatePaymentStatus } = require('../../services/payments');

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
		const payment = await addPayment(
			ctx.from.id,
			ctx.from.username,
			ctx.session.cart,
			total
		);
		ctx.session.paymentId = payment.id;
		ctx.session.awaitingPaymentPhoto = true;
		await editMessage(
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
			ctx.session.paidServices = payment.cart.flatMap((item) =>
				Array(item.quantity).fill({
					name: item.name,
					price: item.price,
					id: item.id,
				})
			);
			ctx.session.hasPaid = true;
			ctx.session.questionCount = questionCount;
			ctx.session.awaitingQuestion = questionCount > 0;
			ctx.session.cart = [];
			await ctx.api.sendMessage(
				payment.userId,
				`${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					payment.total
				)}\n` + `У вас доступно вопросов: ${questionCount}`,
				{ reply_markup: createStartKeyboard(questionCount) }
			);
			console.log(ctx.session);
			// Отправляем новое сообщение вместо редактирования
			await ctx.reply('Платеж подтвержден', {
				parse_mode: 'Markdown',
				reply_markup: createBackKeyboard(ctx.session.questionCount),
			});
			await ctx.answerCallbackQuery('Платеж подтвержден');
		} else {
			await ctx.answerCallbackQuery('Ошибка: платеж не найден');
		}
	} else if (action.startsWith('reject_payment_')) {
		const paymentId = parseInt(action.replace('reject_payment_', ''));
		const payment = await updatePaymentStatus(paymentId, 'rejected');
		if (payment) {
			await ctx.api.sendMessage(
				payment.userId,
				'Ваш платеж был отклонен. Пожалуйста, свяжитесь с администратором.',
				{ reply_markup: createStartKeyboard(ctx.session.questionCount) }
			);
			// Отправляем новое сообщение вместо редактирования
			await ctx.reply('Платеж отклонен', {
				parse_mode: 'Markdown',
				reply_markup: createBackKeyboard(ctx.session.questionCount),
			});
			await ctx.answerCallbackQuery('Платеж отклонен');
		} else {
			await ctx.answerCallbackQuery('Ошибка: платеж не найден');
		}
	}
};

module.exports = { handleCartCallback };
