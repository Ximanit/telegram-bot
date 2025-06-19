const { createStartKeyboard, createBackKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

const validateQuestion = (question) => {
	const trimmed = question.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleText = async (ctx) => {
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
