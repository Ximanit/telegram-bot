const {
	createStartKeyboard,
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	InlineKeyboard,
} = require('../keyboards');
const { MESSAGES, SERVICES } = require('../constants');
const { editMessage, cartUtils } = require('./utils');

// Универсальный обработчик callback'ов
const createCallbackHandler =
	(getText, getKeyboard) => async (ctx, userName) => {
		const text =
			typeof getText === 'function' ? getText(ctx, userName) : getText;
		await editMessage(ctx, text, getKeyboard(ctx));
	};

// Обработчик добавления в корзину
const handleAddToCart = async (ctx, serviceId) => {
	const service = SERVICES.find((s) => s.id === serviceId);
	if (!service) {
		await ctx.answerCallbackQuery(
			`Ошибка: услуга с ID ${serviceId} не найдена`
		);
		return;
	}
	ctx.session.cart.push({
		name: service.name,
		price: service.price,
		id: service.id,
	});
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
	show_reviews: createCallbackHandler(MESSAGES.reviews, () =>
		createBackKeyboard()
	),
	view_cart: createCallbackHandler(
		(ctx) => cartUtils.format(ctx.session.cart),
		() => createCartKeyboard()
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
		await editMessage(ctx, MESSAGES.cartEmpty, createCartKeyboard());
	},
	pay_cart: async (ctx) => {
		if (!ctx.session.cart.length) {
			await ctx.answerCallbackQuery(MESSAGES.cartEmptyWarning);
			return;
		}
		const { total } = cartUtils.summary(ctx.session.cart);
		ctx.session.paidServices = ctx.session.cart;
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
};

// Главный обработчик callback'ов
const handleCallbackQuery = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	const action = ctx.callbackQuery.data;

	if (action.startsWith('add_to_cart_')) {
		return handleAddToCart(ctx, action.replace('add_to_cart_', ''));
	}

	const handler = callbackHandlers[action];
	if (handler) {
		await handler(ctx, userName);
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

module.exports = { handleCallbackQuery };
