const { InlineKeyboard } = require('grammy');

// Клавиатура для команды /start
const createStartKeyboard = () => {
	return new InlineKeyboard()
		.text('Условия', 'show_terms')
		.text('Прайс', 'show_price')
		.row()
		.text('Отзывы', 'show_reviews')
		.text('Оставить отзыв', 'add_review');
};

// Клавиатура для выбора услуг (прайс)
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

// Клавиатура для корзины с кнопками "+" и "−" для изменения количества
const createCartKeyboard = (cart) => {
	const keyboard = new InlineKeyboard();

	// Добавляем кнопки "+" и "−" для каждой уникальной услуги
	if (cart && cart.length > 0) {
		cart.forEach((item) => {
			keyboard
				.text('−', `decrease_quantity_${item.id}`)
				.text(`${item.name} (${item.quantity})`, 'noop') // Текст без действия
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

// Клавиатура с кнопкой "Назад"
const createBackKeyboard = () => {
	return new InlineKeyboard().text('Назад', 'back_to_menu');
};

// Клавиатура для модерации отзывов (для администратора)
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
