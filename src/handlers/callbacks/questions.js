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
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage } = require('../utils');
const { updateSession } = require('../../db');
const logger = require('../../logger');

const handleQuestionCallback = async (ctx, action) => {
	logger.info(
		`Before handleQuestionCallback: chatId=${
			ctx.chat.id
		}, session=${JSON.stringify(ctx.session)}`
	);
	if (action.startsWith('answer_question_')) {
		const questionId = action.replace('answer_question_', '');
		const question = await updateQuestionStatus(questionId, 'in_progress');
		if (question) {
			ctx.session[SESSION_KEYS.AWAITING_ANSWER] = true;
			ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = questionId;
			await sendOrEditMessage(
				ctx,
				'Пожалуйста, введите ваш ответ:',
				createBackKeyboard(),
				true
			);
			await ctx.answerCallbackQuery();
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('reject_question_')) {
		const questionId = action.replace('reject_question_', '');
		ctx.session[SESSION_KEYS.AWAITING_REJECT_REASON] = true;
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = questionId;
		await sendOrEditMessage(
			ctx,
			'Пожалуйста, укажите причину отклонения:',
			createBackKeyboard(),
			true
		);
		await ctx.answerCallbackQuery();
	} else if (action.startsWith('close_question_')) {
		const questionId = action.replace('close_question_', '');
		const question = await updateQuestionStatus(questionId, 'closed');
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
					? MESSAGES.promptReviewAfterCloseAdmin
					: MESSAGES.promptReviewAfterClose;
			const sentMessage = await sendOrEditMessage(
				userCtx,
				messageText,
				createReviewPromptKeyboard(),
				false
			);
			ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
			await updateSession(question.userId, {
				[SESSION_KEYS.LAST_MESSAGE_ID]: {
					[question.userId]: sentMessage.message_id,
				},
			});
			await ctx.answerCallbackQuery('Вопрос закрыт');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('clarify_question_')) {
		const questionId = action.replace('clarify_question_', '');
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = questionId;
		await sendOrEditMessage(
			ctx,
			'Пожалуйста, отправьте уточнение:',
			createBackKeyboard(),
			true
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleQuestionCallback };
