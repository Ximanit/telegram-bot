const {
	createBackKeyboard,
	createStartKeyboard,
	createBackKeyboardADmin,
} = require('../../keyboards');
const { updateSupportQuestionStatus } = require('../../services/support');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');
const { handleNavigationCallback } = require('../callbacks/navigation');

const handleSupportQuestionCallback = async (ctx, action) => {
	if (action.startsWith('answer_support_question_')) {
		const questionId = action.replace('answer_support_question_', '');
		const question = await updateSupportQuestionStatus(
			questionId,
			'in_progress'
		);
		if (question) {
			ctx.session[SESSION_KEYS.AWAITING_SUPPORT_ANSWER] = true;
			ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = questionId;
			await sendOrEditMessage(
				ctx,
				MESSAGES.pleaseEnterYourAnswer,
				createBackKeyboardADmin()
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

			const messageText =
				sender === 'Администратор'
					? 'Вопрос техподдержки закрыт администратором.'
					: 'Вопрос техподдержки закрыт.';

			await sendMessageToUser(
				question.userId,
				messageText,
				createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
				ctx
			);

			ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = null;
			await ctx.answerCallbackQuery('Вопрос техподдержки закрыт');
			handleNavigationCallback(ctx, 'back_to_admin_menu');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос техподдержки не найден');
		}
	} else if (action.startsWith('clarify_support_question_')) {
		const questionId = action.replace('clarify_support_question_', '');
		ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = questionId;
		ctx.session[SESSION_KEYS.AWAITING_SUPPORT_CLARIFICATION] = true;
		await sendOrEditMessage(ctx, MESSAGES.enterСlarify, createBackKeyboard());
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleSupportQuestionCallback };
