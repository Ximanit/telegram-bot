const { InlineKeyboard } = require('grammy');

const createStartKeyboard = () => {
	return new InlineKeyboard()
		.text('Условия', 'show_terms')
		.text('Прайс', 'show_price')
		.row()
		.text('Отзывы', 'show_reviews')
		.text('Оставить отзыв', 'add_review');
};

const createPriceKeyboard = () => {
	return new InlineKeyboard()
		.text('Консультация (30 мин) — 5000 руб.', 'add_to_cart_consultation')
		.row()
		.text('Полный расклад — 10000 руб.', 'add_to_cart_full_reading')
		.row()
		.text('Ответ на 1 вопрос — 2000 руб.', 'add_to_cart_single_question')
		.row()
		.text('Просмотреть корзину', 'view_cart')
		.text('Назад', 'back_to_menu');
};

const createCartKeyboard = (cart) => {
	const keyboard = new InlineKeyboard();
	if (cart && cart.length > 0) {
		cart.forEach((item) => {
			keyboard
				.text('−', `decrease_quantity_${item.id}`)
				.text(`${item.name} (${item.quantity})`, 'noop')
				.text('+', `increase_quantity_${item.id}`)
				.row();
		});
	}
	keyboard
		.text('Очистить корзину', 'clear_cart')
		.text('Оплатить', 'pay_cart')
		.row()
		.text('Назад', 'back_to_price');
	return keyboard;
};

const createBackKeyboard = () => {
	return new InlineKeyboard().text('Назад', 'back_to_menu');
};

const createReviewModerationKeyboard = (reviewId) => {
	return new InlineKeyboard()
		.text('Одобрить', `approve_review_${reviewId}`)
		.text('Отклонить', `reject_review_${reviewId}`);
};

module.exports = {
	createStartKeyboard,
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createReviewModerationKeyboard,
	InlineKeyboard,
};
