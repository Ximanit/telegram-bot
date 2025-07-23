require('dotenv').config();

CARD_DETAILS = process.env.CARD_DETAILS;

const MESSAGES = {
	start:
		'Привет, *%s*! 👋\nБлагодарю, что решил довериться мне! Пожалуйста, ознакомьтесь с Условиями и Прайсом перед тем, как зададите свой вопрос. ❤️',
	error: 'Ой, что-то пошло не так! 😔 Попробуйте позже.',
	errorCallback: 'Ошибка, попробуйте снова',
	unknownMessage: 'Мяу-мяу! 😺 Я не понимаю, выберите одну из кнопочек.',
	meow: 'Мяу-мяу!',
	help: 'Здесь будет помощь и вопросы по боту',
	terms:
		'📜 *Условия* :\n1. Задавайте вопросы четко.\n2. Оплата перед консультацией.\n3. Уважайте мое время.',
	reviewsHeader: '🌟 *Отзывы*:',
	noReviews: 'Пока нет отзывов. Будьте первым! 😺',
	addReviewPrompt: '✍️ Напишите ваш отзыв (минимум 10 символов):',
	reviewSent: 'Спасибо за ваш отзыв! Он будет опубликован после проверки. 😊',
	reviewTooShort: 'Отзыв слишком короткий, напишите минимум 10 символов.',
	reviewReceived: 'Новый отзыв от %username:\n%text\n\nОдобрить?',
	reviewApproved: 'Отзыв одобрен!',
	reviewRejected: 'Отзыв отклонен.',
	price: '💰 *Выберите услугу для добавления в корзину*:',
	cartEmpty: '🛒 Ваша корзина пуста.',
	cartContent: '🛒 *Ваша корзина*:\n%items\n\nОбщая сумма: *%total руб.*',
	cartSummary: '🛒 В корзине: %count услуг на сумму %total руб.',
	cartCleared: 'Корзина очищена',
	cartEmptyWarning: 'Корзина уже пуста',
	confirmClearCart: 'Вы уверены, что хотите очистить корзину?',
	serviceAdded: 'Добавлено: %name',
	paymentConfirmed: 'Оплата подтверждена! Теперь вы можете задать вопрос. 😊',
	paymentNoQuestions: 'Эта услуга пока не поддерживает задавание вопросов.',
	paymentTotal: 'Оплачено: %total руб.',
	askQuestion: '✍️ Напишите свой вопрос, и я передам его администратору.',
	questionSent: 'Ваш вопрос отправлен! Ожидайте ответа. 😊',
	questionTooShort: 'Вопрос слишком короткий. Пожалуйста, уточните ваш вопрос.',
	noQuestionService:
		'У вас нет оплаченной услуги "Ответ на 1 вопрос" или лимит вопросов исчерпан.',
	paymentInstructions: `Пожалуйста, оплатите %total руб. по следующим реквизитам:\n\n${CARD_DETAILS}\n\nПосле оплаты загрузите фото чека.`,
	paymentPhotoSent: 'Фото чека отправлено на проверку администратору.',
	paymentConfirmed: 'Ваш платеж успешно подтвержден!',
	paymentRejected:
		'Ваш платеж был отклонен. Пожалуйста, свяжитесь с администратором.',
	paymentReceived: 'Новый платеж от %username\nСумма: %total руб.',
	questionRejectedWithReason: 'Ваш вопрос был отклонен. Причина: %reason',
	promptReviewAfterClose: 'Ваш вопрос был закрыт. Хотите оставить отзыв?',
	promptReviewAfterCloseAdmin:
		'Ваш вопрос был закрыт администратором.\n Хотите оставить отзыв?',
	paymentRejectedWithReason: 'Ваш платеж был отклонен по причине: \n%reason',
	rejectPaymentReasonPrompt: 'Пожалуйста, укажите причину отклонения платежа:',
	supportQuestionSent:
		'Ваш вопрос техподдержки отправлен. Ожидайте ответа администратора.',
	questionTooShort:
		'Вопрос слишком короткий. Пожалуйста, опишите проблему подробнее (минимум 5 символов).',
	dialogueMessageSent:
		'Ваше сообщение отправлено. Ожидайте ответа администратора.',
	dialogSupportMessagesFinish:
		'Диалог по этому вопросу техподдержки завершен или вопрос не найден.',
	newAdminMessage: 'Сообщение от администратора:',
	messageSendUser: 'Сообщение отправлено пользователю.',
	questionNotFound: 'Ошибка: вопрос не найден.',
	dialogFinishOrNotFound:
		'Диалог по этому вопросу завершен или вопрос не найден.',
	paymentRejectedReasonSend:
		'Платеж отклонен, причина отправлена пользователю.',
	errorPaymentNotFound: 'Ошибка: платеж не найден.',
	questionRejectedReasonSendToUser:
		'Вопрос отклонен, причина отправлена пользователю.',
	enterQuestionSupport:
		'Пожалуйста, опишите ваш вопрос для технической поддержки:',
	admniEnterClose: 'У вас нет доступа к админ-панели.',
	enterAdmin: 'Добро пожаловать в админ-панель!\nВыберите раздел:',
	pleaseEnterYourAnswer: 'Пожалуйста, введите ваш ответ:',
	enterСlarify: 'Пожалуйста, отправьте уточнение:',
	enterReasonReject: 'Пожалуйста, укажите причину отклонения:',
	paymentConfirmedAdmin: 'Платеж подтвержден',
	itemNotFound: 'Элемент не найден.',
	sendYourQuestion: 'Пожалуйста, задайте ваш вопрос:',
};

const SERVICES = [
	{ id: 'single_question', name: 'Ответ на 1 вопрос', price: 2000 },
];

const CALLBACK_ACTIONS = {
	ASK_QUESTION: 'ask_question',
	BACK: 'back',
	SHOW_TERMS: 'show_terms',
	SHOW_PRICE: 'show_price',
	SHOW_REVIEWS: 'show_reviews',
	ADD_REVIEW: 'add_review',
	VIEW_CART: 'view_cart',
	PAY_CART: 'pay_cart',
	CLEAR_CART: 'clear_cart',
	CONFIRM_CLEAR_CART: 'confirm_clear_cart',
	ADD_TO_CART_SINGLE_QUESTION: 'add_to_cart_single_question',
	ANSWER_QUESTION: 'answer_question_',
	REJECT_QUESTION: 'reject_question_',
	CLOSE_QUESTION: 'close_question_',
	CLARIFY_QUESTION: 'clarify_question_',
	ANSWER_SUPPORT_QUESTION: 'answer_support_question_',
	CLOSE_SUPPORT_QUESTION: 'close_support_question_',
	CLARIFY_SUPPORT_QUESTION: 'clarify_support_question_',
	APPROVE_REVIEW: 'approve_review_',
	REJECT_REVIEW: 'reject_review_',
	CONFIRM_PAYMENT: 'confirm_payment_',
	REJECT_PAYMENT: 'reject_payment_',
	NOOP: 'noop',
	BACK_TO_MENU: 'back_to_menu',
	BACK_TO_PRICE: 'back_to_price',
};

const SESSION_KEYS = {
	HAS_PAID: 'hasPaid',
	AWAITING_QUESTION: 'awaitingQuestion',
	AWAITING_REVIEW: 'awaitingReview',
	AWAITING_PAYMENT_PHOTO: 'awaitingPaymentPhoto',
	AWAITING_ANSWER: 'awaitingAnswer',
	AWAITING_REJECT_REASON: 'awaitingRejectReason',
	AWAITING_REJECT_PAYMENT_REASON: 'awaitingRejectPaymentReason',
	AWAITING_SUPPORT_QUESTION: 'awaitingSupportQuestion',
	AWAITING_SUPPORT_ANSWER: 'awaitingSupportAnswer',
	AWAITING_QUESTION_CLARIFICATION: 'awaiting_question_clarification',
	AWAITING_SUPPORT_CLARIFICATION: 'awaiting_support_clarification',
	CURRENT_QUESTION_ID: 'currentQuestionId',
	CURRENT_SUPPORT_QUESTION_ID: 'currentSupportQuestionId',
	CART: 'cart',
	PAID_SERVICES: 'paidServices',
	QUESTION_COUNT: 'questionCount',
	PAYMENT_ID: 'paymentId',
	LAST_MESSAGE_ID: 'lastMessageId',
};

module.exports = {
	MESSAGES,
	SERVICES,
	CALLBACK_ACTIONS,
	SESSION_KEYS,
};
