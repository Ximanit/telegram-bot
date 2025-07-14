const { InlineKeyboard } = require('grammy');

const createStartKeyboard = (questionCount = 0) => {
	const keyboard = new InlineKeyboard()
		.text('Условия', 'show_terms')
		.text('Прайс', 'show_price')
		.row()
		.text('Отзывы', 'show_reviews')
		.text('Личный кабинет', 'show_profile');
	if (questionCount > 0) {
		keyboard.row().text('Задать вопрос', 'ask_question');
	}
	return keyboard;
};

const createPriceKeyboard = () => {
	return new InlineKeyboard()
		.text('Ответ на 1 вопрос — 2000 руб.', 'add_to_cart_single_question')
		.row()
		.text('Просмотреть корзину', 'view_cart')
		.text('Назад', 'back_to_menu');
};

const createCartKeyboard = (cart) => {
	const keyboard = new InlineKeyboard();
	if (cart?.length) {
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

const createBackCartKeyboard = () => {
	return new InlineKeyboard().text('Назад', 'back_from_payment_photo');
};

const createReviewModerationKeyboard = (reviewId) => {
	return new InlineKeyboard()
		.text('Одобрить ✅', `approve_review_${reviewId}`)
		.text('Отклонить ❌', `reject_review_${reviewId}`)
		.row()
		.text('Назад', 'admin_reviews'); // Возврат к списку отзывов
};

const createPaymentConfirmationKeyboard = (paymentId) => {
	return new InlineKeyboard()
		.text('Подтвердить оплату ✅', `confirm_payment_${paymentId}`)
		.text('Отклонить оплату ❌', `reject_payment_${paymentId}`)
		.row()
		.text('Назад', 'admin_payments'); // Возврат к списку платежей
};

const createQuestionActionKeyboard = (questionId) => {
	return new InlineKeyboard()
		.text('Ответить', `answer_question_${questionId}`)
		.text('Отклонить', `reject_question_${questionId}`)
		.text('Закрыть', `close_question_${questionId}`)
		.row()
		.text('Назад', 'admin_questions'); // Возврат к списку вопросов
};

const createUserQuestionActionKeyboard = (questionId) => {
	return new InlineKeyboard()
		.text('Задать уточнения', `clarify_question_${questionId}`)
		.text('Закрыть вопрос', `close_question_${questionId}`)
		.row()
		.text('Назад', 'back_to_menu');
};

const createReviewPromptKeyboard = () => {
	return new InlineKeyboard()
		.text('Оставить отзыв', 'add_review')
		.text('Назад', 'back_to_menu');
};

const createSupportQuestionActionKeyboard = (questionId) => {
	return new InlineKeyboard()
		.text('Ответить', `answer_support_question_${questionId}`)
		.text('Закрыть', `close_support_question_${questionId}`)
		.row()
		.text('Назад', 'admin_support_questions'); // Возврат к списку вопросов техподдержки
};

const createUserSupportQuestionActionKeyboard = (questionId) => {
	return new InlineKeyboard()
		.text('Уточнить', `clarify_support_question_${questionId}`)
		.text('Закрыть', `close_support_question_${questionId}`)
		.row()
		.text('Назад', 'back_to_menu');
};

const createConfirmClearCartKeyboard = () => {
	return new InlineKeyboard()
		.text('Да, очистить', 'confirm_clear_cart')
		.text('Назад', 'back_to_price');
};

const createAdminMenuKeyboard = () => {
	return new InlineKeyboard()
		.text('Отзывы', 'admin_reviews')
		.text('Платежи', 'admin_payments')
		.row()
		.text('Вопросы', 'admin_questions')
		.text('Вопросы тех. поддержки', 'admin_support_questions');
};

module.exports = {
	createStartKeyboard,
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
	createReviewModerationKeyboard,
	createPaymentConfirmationKeyboard,
	createQuestionActionKeyboard,
	createUserQuestionActionKeyboard,
	createReviewPromptKeyboard,
	createSupportQuestionActionKeyboard,
	createUserSupportQuestionActionKeyboard,
	createConfirmClearCartKeyboard,
	createBackCartKeyboard,
	createAdminMenuKeyboard,
};
