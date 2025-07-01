const { createStartKeyboard, createBackKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const validateQuestion = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleQuestionText = async (ctx) => {
	if (ctx.session.questionCount <= 0) {
		ctx.session.awaitingQuestion = false;
		return ctx.reply(MESSAGES.noQuestionService, {
			parse_mode: 'Markdown',
			reply_markup: createBackKeyboard(ctx.session.questionCount),
		});
	}

	const question = validateQuestion(ctx.message.text);
	if (!question) {
		return ctx.reply(MESSAGES.questionTooShort, {
			parse_mode: 'Markdown',
			reply_markup: createBackKeyboard(ctx.session.questionCount),
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

	ctx.session.questionCount -= 1;
	ctx.session.lastAction = null;
	ctx.session.awaitingQuestion = false;
	await ctx.reply(
		`${MESSAGES.questionSent}\nОсталось вопросов: ${ctx.session.questionCount}`,
		{
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(ctx.session.questionCount),
		}
	);
};

module.exports = { handleQuestionText };
