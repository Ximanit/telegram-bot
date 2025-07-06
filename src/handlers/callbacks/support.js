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
const { FileAdapter } = require('@grammyjs/storage-file');

const handleSupportQuestionCallback = async (ctx, action) => {
	if (action.startsWith('answer_support_question_')) {
		const questionId = parseInt(action.replace('answer_support_question_', ''));
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
		const questionId = parseInt(action.replace('close_support_question_', ''));
		const question = await updateSupportQuestionStatus(questionId, 'closed');
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
				awaitingRejectPaymentReason: false,
				awaitingSupportQuestion: false,
				awaitingSupportAnswer: false,
				currentQuestionId: null,
				currentSupportQuestionId: null,
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
					? 'Вопрос техподдержки закрыт администратором.'
					: 'Вопрос техподдержки закрыт.';

			await sendOrEditMessage(
				userCtx,
				messageText,
				createStartKeyboard(userSession.questionCount)
			);

			await storage.write(question.userId.toString(), userSession);
			ctx.session.currentSupportQuestionId = null;
			await ctx.answerCallbackQuery('Вопрос техподдержки закрыт');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос техподдержки не найден');
		}
	} else if (action.startsWith('clarify_support_question_')) {
		const questionId = parseInt(
			action.replace('clarify_support_question_', '')
		);
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
