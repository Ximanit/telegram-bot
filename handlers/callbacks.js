const {
	createStartKeyboard,
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createReviewModerationKeyboard,
	InlineKeyboard,
} = require('../keyboards');
const { MESSAGES, SERVICES } = require('../constants');
const { editMessage, cartUtils } = require('./utils');
const { getReviews, addReview, updateReviewStatus } = require('./reviews');

// Обработчик добавления услуги в корзину
const handleAddToCart = async (ctx, serviceId) => {
	const service = SERVICES.find((s) => s.id === serviceId);
	if (!service) {
		await ctx.answerCallbackQuery(
			`Ошибка: услуга с ID ${serviceId} не найдена`
		);
		return;
	}
	const cartItem = ctx.session.cart.find((item) => item.id === serviceId);
	if (cartItem) {
		cartItem.quantity += 1;
	} else {
		ctx.session.cart.push({
			name: service.name,
			price: service.price,
			id: service.id,
			quantity: 1,
		});
	}
	const { count, total } = cartUtils.summary(ctx.session.cart);
	await ctx.answerCallbackQuery(
		MESSAGES.serviceAdded.replace('%name', service.name)
	);
	await editMessage(
		ctx,
		MESSAGES.cartSummary.replace('%count', count).replace('%total', total),
		createPriceKeyboard()
	);
};

// Обработчик увеличения количества услуги
const handleIncreaseQuantity = async (ctx, serviceId) => {
	const cartItem = ctx.session.cart.find((item) => item.id === serviceId);
	if (!cartItem) {
		await ctx.answerCallbackQuery('Ошибка: услуга не найдена в корзине');
		return;
	}
	cartItem.quantity += 1;
	const { count, total } = cartUtils.summary(ctx.session.cart);
	await ctx.answerCallbackQuery(`Добавлено: ${cartItem.name}`);
	await editMessage(
		ctx,
		cartUtils.format(ctx.session.cart),
		createCartKeyboard(ctx.session.cart)
	);
};

// Обработчик уменьшения количества услуги
const handleDecreaseQuantity = async (ctx, serviceId) => {
	const cartItem = ctx.session.cart.find((item) => item.id === serviceId);
	if (!cartItem) {
		await ctx.answerCallbackQuery('Ошибка: услуга не найдена в корзине');
		return;
	}
	cartItem.quantity -= 1;
	if (cartItem.quantity <= 0) {
		ctx.session.cart = ctx.session.cart.filter((item) => item.id !== serviceId);
	}
	const { count, total } = cartUtils.summary(ctx.session.cart);
	await ctx.answerCallbackQuery(`Удалено: ${cartItem.name}`);
	await editMessage(
		ctx,
		ctx.session.cart.length
			? cartUtils.format(ctx.session.cart)
			: MESSAGES.cartEmpty,
		createCartKeyboard(ctx.session.cart)
	);
};

// Универсальный обработчик callback'ов
const createCallbackHandler =
	(getText, getKeyboard, onExecute) => async (ctx, userName) => {
		try {
			const text =
				typeof getText === 'function' ? await getText(ctx, userName) : getText;
			console.log('Текст для callback:', text); // Отладка: выводим текст перед отправкой
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

// Обработчики callback'ов
const callbackHandlers = {
	back_to_menu: createCallbackHandler(
		(_, userName) => MESSAGES.start.replace('%s', userName),
		() => createStartKeyboard()
	),
	back_to_price: createCallbackHandler(
		(ctx) =>
			MESSAGES.cartSummary
				.replace('%count', cartUtils.summary(ctx.session.cart).count)
				.replace('%total', cartUtils.summary(ctx.session.cart).total),
		() => createPriceKeyboard()
	),
	show_terms: createCallbackHandler(MESSAGES.terms, () => createBackKeyboard()),
	show_price: createCallbackHandler(
		(ctx) =>
			MESSAGES.cartSummary
				.replace('%count', cartUtils.summary(ctx.session.cart).count)
				.replace('%total', cartUtils.summary(ctx.session.cart).total),
		() => createPriceKeyboard()
	),
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
			const finalText = `${MESSAGES.reviewsHeader}\n${reviewText}`;
			console.log('Итоговый текст для отправки:', finalText); // Отладка
			return finalText;
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
	view_cart: createCallbackHandler(
		(ctx) => cartUtils.format(ctx.session.cart),
		(ctx) => createCartKeyboard(ctx.session.cart)
	),
	clear_cart: async (ctx) => {
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
	},
	confirm_clear_cart: async (ctx) => {
		ctx.session.cart = [];
		await ctx.answerCallbackQuery(MESSAGES.cartCleared);
		await editMessage(
			ctx,
			MESSAGES.cartEmpty,
			createCartKeyboard(ctx.session.cart)
		);
	},
	pay_cart: async (ctx) => {
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
	},
	increase_quantity: async (ctx) => {
		const serviceId = ctx.callbackQuery.data.replace('increase_quantity_', '');
		await handleIncreaseQuantity(ctx, serviceId);
	},
	decrease_quantity: async (ctx) => {
		const serviceId = ctx.callbackQuery.data.replace('decrease_quantity_', '');
		await handleDecreaseQuantity(ctx, serviceId);
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
	noop: async (ctx) => {
		await ctx.answerCallbackQuery();
	},
};

// Главный обработчик callback'ов
const handleCallbackQuery = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	const action = ctx.callbackQuery.data;

	console.log('Обработка callback:', action); // Отладка: выводим действие

	if (action.startsWith('add_to_cart_')) {
		return handleAddToCart(ctx, action.replace('add_to_cart_', ''));
	}

	if (action.startsWith('increase_quantity_')) {
		return callbackHandlers.increase_quantity(ctx);
	}

	if (action.startsWith('decrease_quantity_')) {
		return callbackHandlers.decrease_quantity(ctx);
	}

	if (
		action.startsWith('approve_review_') ||
		action.startsWith('reject_review_')
	) {
		const handler = action.startsWith('approve_review_')
			? callbackHandlers.approve_review
			: callbackHandlers.reject_review;
		return handler(ctx);
	}

	const handler = callbackHandlers[action];
	if (handler) {
		await handler(ctx, userName);
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleCallbackQuery };
