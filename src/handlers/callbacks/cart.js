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
				.text('Отмена', 'view_cart')
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

			// Получаем сессию пользователя
			const storage = new FileAdapter({ dir: './src/data/sessions' });
			const userSession = (await storage.read(payment.userId.toString())) || {
				hasPaid: false,
				awaitingQuestion: false,
				awaitingReview: false,
				awaitingPaymentPhoto: false,
				cart: [],
				paidServices: [],
				questionCount: 0,
				paymentId: null,
				lastMessageId: {},
			};

			// Обновляем сессию пользователя
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

			// Создаем временный контекст для отправки сообщения пользователю
			const userCtx = {
				chat: { id: payment.userId },
				session: userSession,
				api: ctx.api,
				answerCallbackQuery: () => {}, // Пустая функция, так как это не callback
			};

			// Отправляем сообщение пользователю с редактированием
			await sendOrEditMessage(
				userCtx,
				`${MESSAGES.paymentConfirmed}\n${MESSAGES.paymentTotal.replace(
					'%total',
					payment.total
				)}\nУ вас доступно вопросов: ${questionCount}`,
				createStartKeyboard(questionCount)
			);

			// Сохраняем обновленную сессию пользователя
			await storage.write(payment.userId.toString(), userSession);

			// Сообщение администратору
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
		const payment = await updatePaymentStatus(paymentId, 'rejected');
		if (payment) {
			// Получаем сессию пользователя
			const storage = new FileAdapter({ dir: './src/data/sessions' });
			const userSession = (await storage.read(payment.userId.toString())) || {
				hasPaid: false,
				awaitingQuestion: false,
				awaitingReview: false,
				awaitingPaymentPhoto: false,
				cart: [],
				paidServices: [],
				questionCount: 0,
				paymentId: null,
				lastMessageId: {},
			};

			// Создаем временный контекст для отправки сообщения пользователю
			const userCtx = {
				chat: { id: payment.userId },
				session: userSession,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			// Отправляем сообщение пользователю с редактированием
			await sendOrEditMessage(
				userCtx,
				'Ваш платеж был отклонен. Пожалуйста, свяжитесь с администратором.',
				createStartKeyboard(0)
			);

			// Сохраняем обновленную сессию пользователя
			await storage.write(payment.userId.toString(), userSession);

			// Сообщение администратору
			await sendOrEditMessage(
				ctx,
				'Платеж отклонен',
				createBackKeyboard(ctx.session.questionCount)
			);
			await ctx.answerCallbackQuery('Платеж отклонен');
		} else {
			await ctx.answerCallbackQuery('Ошибка: платеж не найден');
		}
	}
};

module.exports = { handleCartCallback };
