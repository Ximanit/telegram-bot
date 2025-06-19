const { InlineKeyboard } = require('grammy');

const createStartKeyboard = () => {
	return new InlineKeyboard()
		.text('Условия', 'show_terms')
		.text('Прайс', 'show_price')
		.row()
		.text('Отзывы', 'show_reviews');
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

const createCartKeyboard = () => {
	return new InlineKeyboard()
		.text('Очистить корзину', 'clear_cart')
		.text('Оплатить', 'pay_cart')
		.row()
		.text('Назад', 'back_to_menu');
};

const createBackKeyboard = () => {
	return new InlineKeyboard().text('Назад', 'back_to_menu');
};

module.exports = {
	createStartKeyboard,
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
};
