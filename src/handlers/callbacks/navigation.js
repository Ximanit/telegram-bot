const {
	createStartKeyboard,
	createPriceKeyboard,
	createBackKeyboard,
	createAdminMenuKeyboard,
	createUserQuestionsKeyboard,
	createUserQuestionActionKeyboard,
} = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage } = require('../utils');
const { cartUtils } = require('../utils/cart');
const { InlineKeyboard } = require('grammy');
const { getProcessingQuestions } = require('../../services/questions');
const logger = require('../../logger');

const callbackHandlers = {
	// Возврат в главное меню
	back_to_menu: {
		text: (ctx) => MESSAGES.start.replace('%s', ctx.from?.first_name || 'Друг'),
		keyboard: (ctx) =>
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
			ctx.session[SESSION_KEYS.AWAITING_REVIEW] = false;
			ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO] = false;
			ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
			ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION] = false;
			ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER] = false;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) => `Пользователь ${ctx.chat.id} вернулся в главное меню`,
	},

	// Возврат в админ-панель
	back_to_admin_menu: {
		text: () => 'Добро пожаловать в админ-панель!\nВыберите раздел:',
		keyboard: () => createAdminMenuKeyboard(),
		logMessage: (ctx) => `Администратор ${ctx.chat.id} вернулся в админ-панель`,
	},

	// Показ личного кабинета
	show_profile: {
		text: async (ctx) => {
			const questions = await getProcessingQuestions();
			const userQuestions = questions.filter(
				(q) => q.userId.toString() === ctx.from.id.toString()
			);
			let currentMessage = `Ваш личный кабинет:\n\nДоступно вопросов: ${
				ctx.session[SESSION_KEYS.QUESTION_COUNT] || 0
			}\n\nАктивные вопросы:\n`;
			if (!userQuestions.length) {
				currentMessage += 'Нет активных вопросов.';
			}
			return currentMessage;
		},
		keyboard: async (ctx) => {
			const questions = await getProcessingQuestions();
			const userQuestions = questions.filter(
				(q) => q.userId.toString() === ctx.from.id.toString()
			);
			const keyboard = createUserQuestionsKeyboard(userQuestions);
			return keyboard;
		},
		logMessage: (ctx) => `Пользователь ${ctx.chat.id} просмотрел профиль`,
	},

	// Возврат к прайс-листу
	back_to_price: {
		text: (ctx) => {
			return ctx.session[SESSION_KEYS.CART]?.length
				? cartUtils.format(ctx.session[SESSION_KEYS.CART])
				: MESSAGES.cartEmpty;
		},
		keyboard: () => createPriceKeyboard(),
		logMessage: (ctx) =>
			`Пользователь ${ctx.chat.id} вернулся в меню прайс-листа`,
	},

	// Показ условий
	show_terms: {
		text: MESSAGES.terms,
		keyboard: () => createBackKeyboard(),
		logMessage: (ctx) => `Пользователь ${ctx.chat.id} просмотрел условия`,
	},

	// Показ прайс-листа
	show_price: {
		text: (ctx) => {
			return ctx.session[SESSION_KEYS.CART]?.length
				? cartUtils.format(ctx.session[SESSION_KEYS.CART])
				: MESSAGES.cartEmpty;
		},
		keyboard: () => createPriceKeyboard(),
		logMessage: (ctx) => `Пользователь ${ctx.chat.id} просмотрел прайс-лист`,
	},

	// Обработка кнопки "Назад" при вводе вопроса
	back_from_question: {
		text: (ctx) => MESSAGES.start.replace('%s', ctx.from?.first_name || 'Друг'),
		keyboard: (ctx) =>
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) => `Пользователь ${ctx.chat.id} отменил ввод вопроса`,
	},

	// Обработка кнопки "Назад" при вводе отзыва
	back_from_review: {
		text: (ctx) => MESSAGES.start.replace('%s', ctx.from?.first_name || 'Друг'),
		keyboard: (ctx) =>
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_REVIEW] = false;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) => `Пользователь ${ctx.chat.id} отменил ввод отзыва`,
	},

	// Обработка кнопки "Назад" при загрузке фото платежа
	back_from_payment_photo: {
		text: (ctx) => {
			return ctx.session[SESSION_KEYS.CART]?.length
				? cartUtils.format(ctx.session[SESSION_KEYS.CART])
				: MESSAGES.cartEmpty;
		},
		keyboard: (ctx) => {
			return ctx.session[SESSION_KEYS.CART]?.length
				? createCartKeyboard(ctx.session[SESSION_KEYS.CART])
				: createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]);
		},
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO] = false;
			ctx.session[SESSION_KEYS.PAYMENT_ID] = null;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) =>
			`Пользователь ${ctx.chat.id} отменил загрузку фото платежа`,
	},

	// Обработка кнопки "Назад" при вводе ответа администратором
	back_from_answer: {
		text: () => 'Действие отменено.',
		keyboard: () => createBackKeyboard(),
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
			ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) => `Администратор ${ctx.chat.id} отменил ввод ответа`,
	},

	// Обработка кнопки "Назад" при вводе причины отклонения вопроса
	back_from_reject_reason: {
		text: () =>
			'Вы уверены, что хотите отменить ввод причины? Данные будут потеряны.',
		keyboard: () =>
			new InlineKeyboard()
				.text('Да, отменить', 'confirm_cancel_reject')
				.text('Продолжить ввод', 'continue_input'),
		logMessage: (ctx) =>
			`Администратор ${ctx.chat.id} нажал "Назад" при вводе причины отклонения вопроса`,
	},

	// Обработка кнопки "Назад" при вводе причины отклонения платежа
	back_from_reject_payment_reason: {
		text: () =>
			'Вы уверены, что хотите отменить ввод причины? Данные будут потеряны.',
		keyboard: () =>
			new InlineKeyboard()
				.text('Да, отменить', 'confirm_cancel_reject')
				.text('Продолжить ввод', 'continue_input'),
		logMessage: (ctx) =>
			`Администратор ${ctx.chat.id} нажал "Назад" при вводе причины отклонения платежа`,
	},

	// Обработка кнопки "Назад" при вводе вопроса техподдержки
	back_from_support_question: {
		text: (ctx) => MESSAGES.start.replace('%s', ctx.from?.first_name || 'Друг'),
		keyboard: (ctx) =>
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION] = false;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) =>
			`Пользователь ${ctx.chat.id} отменил ввод вопроса техподдержки`,
	},

	// Обработка кнопки "Назад" при вводе ответа техподдержки
	back_from_support_answer: {
		text: () => 'Действие отменено.',
		keyboard: () => createBackKeyboard(),
		resetSession: (ctx) => {
			ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER] = false;
			ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = null;
			ctx.session[SESSION_KEYS.LAST_ACTION] = null;
		},
		logMessage: (ctx) =>
			`Администратор ${ctx.chat.id} отменил ввод ответа техподдержки`,
	},
};

const handleNavigationCallback = async (ctx, action) => {
	if (action.startsWith('view_question_')) {
		const questionId = action.replace('view_question_', '');
		const questions = await getProcessingQuestions();
		const question = questions.find((q) => q._id.toString() === questionId);
		if (question) {
			let message = `Вопрос: ${question.text}\n\nДиалог:\n`;
			if (question.dialogue && question.dialogue.length) {
				message += question.dialogue
					.map((msg, index) => `${index + 1}. ${msg.sender}: ${msg.message}`)
					.join('\n');
			} else {
				message += 'Диалог пуст.';
			}
			await sendOrEditMessage(
				ctx,
				message,
				createUserQuestionActionKeyboard(questionId)
			);
			logger.info(
				`Пользователь ${ctx.chat.id} просмотрел вопрос ${questionId}`
			);
		} else {
			await sendOrEditMessage(
				ctx,
				MESSAGES.questionNotFound,
				createBackKeyboard()
			);
			logger.error(`Вопрос ${questionId} не найден`);
		}
		await ctx.answerCallbackQuery();
		return;
	}

	let backAction = 'back_to_menu';
	if (ctx.session[SESSION_KEYS.AWAITING_QUESTION]) {
		backAction = 'back_from_question';
	} else if (ctx.session[SESSION_KEYS.AWAITING_REVIEW]) {
		backAction = 'back_from_review';
	} else if (ctx.session[SESSION_KEYS.AWAITING_PAYMENT_PHOTO]) {
		backAction = 'back_from_payment_photo';
	} else if (ctx.session[SESSION_KEYS.AWAITING_ANSWER]) {
		backAction = 'back_from_answer';
	} else if (ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON]) {
		backAction = 'back_from_reject_reason';
	} else if (ctx.session[SESSION_KEYS.AWAITING_REJECT_PAYMENT_REASON]) {
		backAction = 'back_from_reject_payment_reason';
	} else if (ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION]) {
		backAction = 'back_from_support_question';
	} else if (ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER]) {
		backAction = 'back_from_support_answer';
	}

	const handler = callbackHandlers[action] || callbackHandlers[backAction];
	if (handler) {
		logger.info(
			`Вызов обработчика для действия ${
				action || backAction
			} для пользователя ${ctx.chat.id}, сессия: ${JSON.stringify(ctx.session)}`
		);
		// Дожидаемся выполнения асинхронных функций
		const text = await (typeof handler.text === 'function'
			? handler.text(ctx)
			: Promise.resolve(handler.text));
		const keyboard = await handler.keyboard(ctx);
		await sendOrEditMessage(ctx, text, keyboard);
		if (handler.resetSession) {
			handler.resetSession(ctx);
		}
		logger.info(handler.logMessage(ctx));
	} else {
		logger.warn(
			`Неизвестное действие: ${action} для пользователя ${ctx.chat.id}`
		);
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
	await ctx.answerCallbackQuery();
};

module.exports = { handleNavigationCallback };
