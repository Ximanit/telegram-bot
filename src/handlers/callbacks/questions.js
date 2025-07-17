const {
	createBackKeyboard,
	createReviewPromptKeyboard,
} = require('../../keyboards');
const { updateQuestionStatus } = require('../../services/questions');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');
const logger = require('../../logger');

const handleQuestionCallback = async (ctx, action) => {
	logger.info(
		`Обработка callback действия ${action} для чата ${
			ctx.chat.id
		}, сессия: ${JSON.stringify(ctx.session)}`
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
			logger.info(
				`Администратор ${ctx.from.id} начал отвечать на вопрос ${questionId}`
			);
			await ctx.answerCallbackQuery();
		} else {
			logger.error(`Вопрос ${questionId} не найден при попытке ответа`);
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
		logger.info(
			`Администратор ${ctx.from.id} запросил ввод причины отклонения для вопроса ${questionId}`
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
			const messageText =
				sender === 'Администратор'
					? MESSAGES.promptReviewAfterCloseAdmin
					: MESSAGES.promptReviewAfterClose;
			await sendMessageToUser(
				question.userId,
				messageText,
				createReviewPromptKeyboard(),
				ctx
			);
			ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
			logger.info(`Вопрос ${questionId} закрыт администратором ${ctx.from.id}`);
			await ctx.answerCallbackQuery('Вопрос закрыт');
		} else {
			logger.error(`Вопрос ${questionId} не найден при попытке закрытия`);
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('clarify_question_')) {
		const questionId = action.replace('clarify_question_', '');
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = questionId;
		await sendOrEditMessage(
			ctx,
			'Пожалуйста, отправьте уточнение:',
			createBackKeyboard()
		);
		logger.info(
			`Администратор ${ctx.from.id} запросил уточнение для вопроса ${questionId}`
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleQuestionCallback };
