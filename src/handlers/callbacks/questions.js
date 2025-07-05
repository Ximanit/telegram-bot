// src/handlers/callbacks/questions.js
const {
	createBackKeyboard,
	createQuestionActionKeyboard,
	createUserQuestionActionKeyboard,
	createReviewPromptKeyboard,
} = require('../../keyboards');
const {
	updateQuestionStatus,
	addDialogueMessage,
} = require('../../services/questions');
const { MESSAGES } = require('../../constants');
const { editMessage } = require('../utils');

const handleQuestionCallback = async (ctx, action) => {
	if (action.startsWith('answer_question_')) {
		const questionId = parseInt(action.replace('answer_question_', ''));
		const question = await updateQuestionStatus(questionId, 'in_progress');
		if (question) {
			ctx.session.awaitingAnswer = true;
			ctx.session.currentQuestionId = questionId;
			await editMessage(
				ctx,
				'Пожалуйста, введите ваш ответ:',
				createBackKeyboard()
			);
			await ctx.answerCallbackQuery();
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('reject_question_')) {
		const questionId = parseInt(action.replace('reject_question_', ''));
		ctx.session.awaitingRejectReason = true;
		ctx.session.currentQuestionId = questionId;
		await editMessage(
			ctx,
			'Пожалуйста, укажите причину отклонения:',
			createBackKeyboard()
		);
		await ctx.answerCallbackQuery();
	} else if (action.startsWith('close_question_')) {
		const questionId = parseInt(action.replace('close_question_', ''));
		const question = await updateQuestionStatus(questionId, 'closed');
		if (question) {
			const sender =
				ctx.from.id.toString() === process.env.ADMIN_ID
					? 'Администратор'
					: 'Пользователь';
			if (sender === 'Пользователь') {
				await ctx.api.sendMessage(
					question.userId,
					MESSAGES.promptReviewAfterClose,
					{
						parse_mode: 'Markdown',
						reply_markup: createReviewPromptKeyboard(),
					}
				);
			}
			await editMessage(ctx, 'Вопрос закрыт.', createBackKeyboard());
			ctx.session.currentQuestionId = null;
			await ctx.answerCallbackQuery('Вопрос закрыт');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('clarify_question_')) {
		await editMessage(
			ctx,
			'Пожалуйста, отправьте уточнение:',
			createBackKeyboard()
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleQuestionCallback };
