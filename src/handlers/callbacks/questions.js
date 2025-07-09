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
			ctx.session.awaitingAnswer = true;
			ctx.session.currentQuestionId = questionId;
			const sentMessage = await sendOrEditMessage(
				ctx,
				'Пожалуйста, введите ваш ответ:',
				createBackKeyboard(),
				true // Создаём новое сообщение для администратора
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
				awaitingAnswer: true,
				currentQuestionId: questionId,
			});
			await ctx.answerCallbackQuery();
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('reject_question_')) {
		const questionId = action.replace('reject_question_', '');
		ctx.session.awaitingRejectReason = true;
		ctx.session.currentQuestionId = questionId;
		const sentMessage = await sendOrEditMessage(
			ctx,
			'Пожалуйста, укажите причину отклонения:',
			createBackKeyboard(),
			true // Создаём новое сообщение
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		await updateSession(ctx.from.id, {
			lastMessageId: ctx.session.lastMessageId,
			awaitingRejectReason: true,
			currentQuestionId: questionId,
		});
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
				false // Редактируем последнее сообщение, если возможно
			);
			ctx.session.lastMessageId[question.userId] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
				currentQuestionId: null,
			});
			await ctx.answerCallbackQuery('Вопрос закрыт');
		} else {
			await ctx.answerCallbackQuery('Ошибка: вопрос не найден');
		}
	} else if (action.startsWith('clarify_question_')) {
		const questionId = action.replace('clarify_question_', '');
		ctx.session.currentQuestionId = questionId;
		const sentMessage = await sendOrEditMessage(
			ctx,
			'Пожалуйста, отправьте уточнение:',
			createBackKeyboard(),
			true // Создаём новое сообщение
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		await updateSession(ctx.from.id, {
			lastMessageId: ctx.session.lastMessageId,
			currentQuestionId: questionId,
		});
		await ctx.answerCallbackQuery();
	}
};

module.exports = { handleQuestionCallback };
