// src/handlers/text/questions.js
const {
	createStartKeyboard,
	createBackKeyboard,
	createQuestionActionKeyboard,
	createUserQuestionActionKeyboard,
} = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const {
	addQuestion,
	addDialogueMessage,
	getQuestions,
} = require('../../services/questions');
const { editMessage } = require('../utils');

const validateQuestion = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleQuestionText = async (ctx) => {
	if (ctx.session.awaitingQuestion) {
		if (ctx.session.questionCount <= 0) {
			ctx.session.awaitingQuestion = false;
			return editMessage(
				ctx,
				MESSAGES.noQuestionService,
				createBackKeyboard(ctx.session.questionCount)
			);
		}

		const question = validateQuestion(ctx.message.text);
		if (!question) {
			return editMessage(
				ctx,
				MESSAGES.questionTooShort,
				createBackKeyboard(ctx.session.questionCount)
			);
		}

		const userInfo = ctx.from.username
			? `@${ctx.from.username}`
			: `ID ${ctx.from.id}`;
		const userName = ctx.from?.first_name || 'Пользователь';
		const newQuestion = await addQuestion(
			ctx.from.id,
			ctx.from.username,
			question
		);

		await ctx.api.sendMessage(
			process.env.ADMIN_ID,
			`Новый вопрос от ${userInfo} (${userName}):\n${question}`,
			{
				parse_mode: 'Markdown',
				reply_markup: createQuestionActionKeyboard(newQuestion.id),
			}
		);

		ctx.session.questionCount -= 1;
		ctx.session.awaitingQuestion = false;
		ctx.session.currentQuestionId = newQuestion.id;
		await ctx.reply(
			`${MESSAGES.questionSent}\nОсталось вопросов: ${ctx.session.questionCount}`,
			{
				parse_mode: 'Markdown',
				reply_markup: createStartKeyboard(ctx.session.questionCount),
			}
		);
	} else if (ctx.session.currentQuestionId) {
		const question = (await getQuestions()).find(
			(q) =>
				q.id === ctx.session.currentQuestionId && q.status === 'in_progress'
		);
		if (question) {
			const userInfo = ctx.from.username
				? `@${ctx.from.username}`
				: `ID ${ctx.from.id}`;
			const userName = ctx.from?.first_name || 'Пользователь';
			await addDialogueMessage(question.id, 'user', ctx.message.text);
			await ctx.api.sendMessage(
				process.env.ADMIN_ID,
				`Сообщение от ${userInfo} (${userName}) по вопросу #${question.id}:\n${ctx.message.text}`,
				{
					parse_mode: 'Markdown',
					reply_markup: createQuestionActionKeyboard(question.id),
				}
			);
			await ctx.reply(MESSAGES.dialogueMessageSent, {
				parse_mode: 'Markdown',
			});
		} else {
			ctx.session.currentQuestionId = null;
			await editMessage(
				ctx,
				'Диалог по этому вопросу завершен или вопрос не найден.',
				createStartKeyboard(ctx.session.questionCount)
			);
		}
	} else {
		await editMessage(
			ctx,
			MESSAGES.unknownMessage,
			createStartKeyboard(ctx.session.questionCount)
		);
	}
};

module.exports = { handleQuestionText };
