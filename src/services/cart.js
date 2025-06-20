const { MESSAGES, SERVICES } = require('../constants');
const { createPriceKeyboard, createCartKeyboard } = require('../keyboards');
const { editMessage, cartUtils } = require('../handlers/utils');

const addToCart = async (ctx, serviceId) => {
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

const increaseQuantity = async (ctx, serviceId) => {
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

const decreaseQuantity = async (ctx, serviceId) => {
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

module.exports = { addToCart, increaseQuantity, decreaseQuantity };
