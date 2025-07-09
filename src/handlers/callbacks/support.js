const {
	createBackKeyboard,
	createStartKeyboard,
	createUserSupportQuestionActionKeyboard,
} = require('../../keyboards');
const {
	updateSupportQuestionStatus,
	addSupportDialogueMessage,
} = require('../../services/support');
const { MESSAGES } = require('../../constants');
const { sendOrEditMessage } = require('../utils');

const handleSupportQuestionCallback = async (ctx, action) => {
	if (action.startsWith('answer_support_question_')) {
		const questionId = action.replace('answer_support_question_', '');
		const question = await updateSupportQuestionStatus(
			questionId,
			'in_progress'
		);
		if (question) {
			ctx.session.awaitingSupportAnswer = true;
			ctx.session.currentSupportQuestionId = questionId;
			await sendOrEditMessage(
				ctx,
				'Пожалуйста, введите ваш ответ:',
				createBackKeyboard()
			);
			await ctx.answerCallbackQuery();
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос техподдержки не найден');
		}
	} else if (action.startsWith('close_support_question_')) {
		const questionId = action.replace('close_support_question_', '');
		const question = await updateSupportQuestionStatus(questionId, 'closed');
		if (question) {
			const sender =
				ctx.from.id.toString() === process.env.ADMIN_ID
					? 'Администратор'
					: 'Пользователь';

			const userCtx = {
				chat: { id: question.userId },
				session: ctx.session,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const messageText =
				sender === 'Администратор'
					? 'Вопрос техподдержки закрыт администратором.'
					: 'Вопрос техподдержки закрыт.';

			await sendOrEditMessage(
				userCtx,
				messageText,
				createStartKeyboard(ctx.session.questionCount)
			);

			ctx.session.currentSupportQuestionId = null;
			await ctx.answerCallbackQuery('Вопрос техподдержки закрыт');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос техподдержки не найден');
		}
	} else if (action.startsWith('clarify_support_question_')) {
		const questionId = action.replace('clarify_support_question_', '');
		ctx.session.currentSupportQuestionId = questionId;
		await sendOrEditMessage(
			ctx,
			'Пожалуйста, отправьте уточнение:',
			createBackKeyboard()
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleSupportQuestionCallback };
