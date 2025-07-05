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
const { sendOrEditMessage } = require('../utils');
const { FileAdapter } = require('@grammyjs/storage-file');

const handleQuestionCallback = async (ctx, action) => {
	if (action.startsWith('answer_question_')) {
		const questionId = parseInt(action.replace('answer_question_', ''));
		const question = await updateQuestionStatus(questionId, 'in_progress');
		if (question) {
			ctx.session.awaitingAnswer = true;
			ctx.session.currentQuestionId = questionId;
			await sendOrEditMessage(
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
		await sendOrEditMessage(
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

			const storage = new FileAdapter({ dir: './src/data/sessions' });
			const userSession = (await storage.read(question.userId.toString())) || {
				hasPaid: false,
				awaitingQuestion: false,
				awaitingReview: false,
				awaitingPaymentPhoto: false,
				awaitingAnswer: false,
				awaitingRejectReason: false,
				currentQuestionId: null,
				cart: [],
				paidServices: [],
				questionCount: 0,
				paymentId: null,
				lastMessageId: {},
				history: [],
			};

			const userCtx = {
				chat: { id: question.userId },
				session: userSession,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const messageText =
				sender === 'Администратор'
					? MESSAGES.promptReviewAfterCloseAdmin
					: MESSAGES.promptReviewAfterClose;

			await sendOrEditMessage(
				userCtx,
				messageText,
				createReviewPromptKeyboard()
			);

			await storage.write(question.userId.toString(), userSession);
			ctx.session.currentQuestionId = null;
			await ctx.answerCallbackQuery('Вопрос закрыт');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('clarify_question_')) {
		await sendOrEditMessage(
			ctx,
			'Пожалуйста, отправьте уточнение:',
			createBackKeyboard()
		);
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleQuestionCallback };
