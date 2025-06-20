const {
	createStartKeyboard,
	createBackKeyboard,
	createReviewModerationKeyboard,
} = require('../keyboards');
const { MESSAGES } = require('../constants');
const { addReview } = require('./reviews');

// Валидация вопроса (минимум 5 символов)
const validateQuestion = (question) => {
	const trimmed = question.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

// Валидация отзыва (минимум 10 символов)
const validateReview = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 10 ? trimmed : null;
};

// Обработчик текстовых сообщений
const handleText = async (ctx) => {
	if (ctx.message.text === 'Мяу') {
		return ctx.reply(MESSAGES.meow, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
	}

	// Обработка отзыва
	if (ctx.session.awaitingReview) {
		const reviewText = validateReview(ctx.message.text);
		if (!reviewText) {
			return ctx.reply(MESSAGES.reviewTooShort, {
				parse_mode: 'Markdown',
				reply_markup: createBackKeyboard(),
			});
		}

		const review = await addReview(ctx.from.id, ctx.from.username, reviewText);

		// Уведомление администратору
		await ctx.api.sendMessage(
			process.env.ADMIN_ID,
			MESSAGES.reviewReceived
				.replace('%username', ctx.from.username || `ID ${ctx.from.id}`)
				.replace('%text', reviewText),
			{
				parse_mode: 'Markdown',
				reply_markup: createReviewModerationKeyboard(review.id),
			}
		);

		ctx.session.awaitingReview = false;
		ctx.session.lastAction = null;
		return ctx.reply(MESSAGES.reviewSent, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
	}

	// Обработка вопроса
	if (!ctx.session.awaitingQuestion) {
		return ctx.reply(MESSAGES.unknownMessage, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
	}

	const hasQuestionService = ctx.session.paidServices?.some(
		(s) => s.id === 'single_question' && (ctx.session.questionCount || 0) < 1
	);
	if (!hasQuestionService) {
		ctx.session.awaitingQuestion = false;
		return ctx.reply(MESSAGES.noQuestionService, {
			parse_mode: 'Markdown',
			reply_markup: createBackKeyboard(),
		});
	}

	const question = validateQuestion(ctx.message.text);
	if (!question) {
		return ctx.reply(MESSAGES.questionTooShort, {
			parse_mode: 'Markdown',
			reply_markup: createBackKeyboard(),
		});
	}

	const userInfo = ctx.from.username
		? `@${ctx.from.username}`
		: `ID ${ctx.from.id}`;
	const userName = ctx.from?.first_name || 'Пользователь';
	await ctx.api.sendMessage(
		process.env.ADMIN_ID,
		`Новый вопрос от ${userInfo} (${userName}):\n${question}`
	);

	ctx.session.questionCount = (ctx.session.questionCount || 0) + 1;
	ctx.session.lastAction = null;
	ctx.session.awaitingQuestion = false;
	await ctx.reply(MESSAGES.questionSent, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

module.exports = { handleText };
