const { MESSAGES, SERVICES, SESSION_KEYS } = require('../constants');
const { createPriceKeyboard, createCartKeyboard } = require('../keyboards');
const { sendOrEditMessage, cartUtils } = require('../handlers/utils');

const addToCart = async (ctx, serviceId) => {
	const service = SERVICES.find((s) => s.id === serviceId);
	if (!service) {
		await ctx.answerCallbackQuery(
			`Ошибка: услуга с ID ${serviceId} не найдена`
		);
		return;
	}
	const cartItem = ctx.session[SESSION_KEYS.CART].find(
		(item) => item.id === serviceId
	);
	if (cartItem) {
		cartItem.quantity += 1;
	} else {
		ctx.session[SESSION_KEYS.CART].push({
			name: service.name,
			price: service.price,
			id: service.id,
			quantity: 1,
		});
	}
	const { count, total } = cartUtils.summary(ctx.session[SESSION_KEYS.CART]);
	await ctx.answerCallbackQuery(
		MESSAGES.serviceAdded.replace('%name', service.name)
	);
	await sendOrEditMessage(
		ctx,
		MESSAGES.cartSummary.replace('%count', count).replace('%total', total),
		createPriceKeyboard()
	);
};

const increaseQuantity = async (ctx, serviceId) => {
	const cartItem = ctx.session[SESSION_KEYS.CART].find(
		(item) => item.id === serviceId
	);
	if (!cartItem) {
		await ctx.answerCallbackQuery('Ошибка: услуга не найдена в корзине');
		return;
	}
	cartItem.quantity += 1;
	const { count, total } = cartUtils.summary(ctx.session[SESSION_KEYS.CART]);
	await ctx.answerCallbackQuery(`Добавлено: ${cartItem.name}`);
	await sendOrEditMessage(
		ctx,
		cartUtils.format(ctx.session[SESSION_KEYS.CART]),
		createCartKeyboard(ctx.session[SESSION_KEYS.CART])
	);
};

const decreaseQuantity = async (ctx, serviceId) => {
	const cartItem = ctx.session[SESSION_KEYS.CART].find(
		(item) => item.id === serviceId
	);
	if (!cartItem) {
		await ctx.answerCallbackQuery('Ошибка: услуга не найдена в корзине');
		return;
	}
	cartItem.quantity -= 1;
	if (cartItem.quantity <= 0) {
		ctx.session[SESSION_KEYS.CART] = ctx.session[SESSION_KEYS.CART].filter(
			(item) => item.id !== serviceId
		);
	}
	const { count, total } = cartUtils.summary(ctx.session[SESSION_KEYS.CART]);
	await ctx.answerCallbackQuery(`Удалено: ${cartItem.name}`);
	await sendOrEditMessage(
		ctx,
		ctx.session[SESSION_KEYS.CART].length
			? cartUtils.format(ctx.session[SESSION_KEYS.CART])
			: MESSAGES.cartEmpty,
		createCartKeyboard(ctx.session[SESSION_KEYS.CART])
	);
};

module.exports = { addToCart, increaseQuantity, decreaseQuantity };
