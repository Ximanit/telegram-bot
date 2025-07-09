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
const { connectDB, updateSession } = require('../../db');
const logger = require('../../logger');
const { ObjectId } = require('mongodb');
const { sendOrEditMessage } = require('../utils');

const validateQuestion = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleQuestionText = async (ctx) => {
	logger.info(
		`Before handleQuestionText: chatId=${ctx.chat.id}, session=${JSON.stringify(
			ctx.session
		)}`
	);
	if (ctx.session.awaitingQuestion) {
		if (ctx.session.questionCount <= 0) {
			ctx.session.awaitingQuestion = false;
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.noQuestionService,
				createBackKeyboard(ctx.session.questionCount),
				true // Создаём новое сообщение
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
				awaitingQuestion: false,
			});
			return;
		}

		const question = validateQuestion(ctx.message.text);
		if (!question) {
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.questionTooShort,
				createBackKeyboard(ctx.session.questionCount),
				true // Создаём новое сообщение
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
			});
			return;
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
				reply_markup: createQuestionActionKeyboard(newQuestion._id.toString()),
			}
		);

		ctx.session.questionCount -= 1;
		ctx.session.awaitingQuestion = false;
		ctx.session.currentQuestionId = newQuestion._id.toString();
		const sentMessage = await sendOrEditMessage(
			ctx,
			`${MESSAGES.questionSent}\nОсталось вопросов: ${ctx.session.questionCount}`,
			createStartKeyboard(ctx.session.questionCount),
			true // Создаём новое сообщение
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		await updateSession(ctx.from.id, {
			lastMessageId: ctx.session.lastMessageId,
			questionCount: ctx.session.questionCount,
			awaitingQuestion: false,
			currentQuestionId: newQuestion._id.toString(),
		});
	} else if (
		ctx.session.awaitingAnswer &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session.currentQuestionId;
		const answer = ctx.message.text;
		const question = await addDialogueMessage(questionId, 'admin', answer);
		if (question) {
			const db = await connectDB();
			const sessions = db.collection('sessions');
			const userSession = await sessions.findOne({
				key: question.userId.toString(),
			});
			if (!userSession) {
				logger.error(`Session for user ${question.userId} not found`);
				const sentMessage = await ctx.api.sendMessage(
					ctx.chat.id,
					'Ошибка: сессия пользователя не найдена.',
					{
						parse_mode: 'Markdown',
						reply_markup: createBackKeyboard(),
					}
				);
				ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
				await updateSession(ctx.from.id, {
					lastMessageId: ctx.session.lastMessageId,
					awaitingAnswer: false,
				});
				return;
			}

			const userCtx = {
				chat: { id: question.userId },
				session: userSession.value,
				api: ctx.api,
				answerCallbackQuery: () => {},
			};

			const sentMessage = await sendOrEditMessage(
				userCtx,
				`Сообщение от администратора по вашему вопросу #${questionId}:\n${answer}`,
				createUserQuestionActionKeyboard(questionId),
				false // Редактируем последнее сообщение, если возможно
			);
			userSession.value.lastMessageId = userSession.value.lastMessageId || {};
			userSession.value.lastMessageId[question.userId] = sentMessage.message_id;
			await updateSession(question.userId, {
				lastMessageId: userSession.value.lastMessageId,
			});

			const adminMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Сообщение отправлено пользователю.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = adminMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
				awaitingAnswer: false,
			});
			logger.info(
				`Admin answered question ${questionId} for user ${question.userId}`
			);
		} else {
			const sentMessage = await ctx.api.sendMessage(
				ctx.chat.id,
				'Ошибка: вопрос не найден.',
				{
					parse_mode: 'Markdown',
					reply_markup: createBackKeyboard(),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
			});
			logger.error(`Question ${questionId} not found for answering`);
		}
	} else if (ctx.session.currentQuestionId) {
		const question = (await getQuestions()).find(
			(q) =>
				q._id.toString() === ctx.session.currentQuestionId &&
				q.status === 'in_progress'
		);
		if (question) {
			const userInfo = ctx.from.username
				? `@${ctx.from.username}`
				: `ID ${ctx.from.id}`;
			const userName = ctx.from?.first_name || 'Пользователь';
			await addDialogueMessage(question._id, 'user', ctx.message.text);
			await ctx.api.sendMessage(
				process.env.ADMIN_ID,
				`Сообщение от ${userInfo} (${userName}) по вопросу #${question._id}:\n${ctx.message.text}`,
				{
					parse_mode: 'Markdown',
					reply_markup: createQuestionActionKeyboard(question._id.toString()),
				}
			);
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.dialogueMessageSent,
				createUserQuestionActionKeyboard(question._id.toString()),
				true // Создаём новое сообщение для уточнения
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
			});
		} else {
			ctx.session.currentQuestionId = null;
			const sentMessage = await sendOrEditMessage(
				ctx,
				'Диалог по этому вопросу завершен или вопрос не найден.',
				createStartKeyboard(ctx.session.questionCount),
				true // Создаём новое сообщение
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			await updateSession(ctx.from.id, {
				lastMessageId: ctx.session.lastMessageId,
				currentQuestionId: null,
			});
		}
	} else {
		const sentMessage = await sendOrEditMessage(
			ctx,
			MESSAGES.unknownMessage,
			createStartKeyboard(ctx.session.questionCount),
			true // Создаём новое сообщение
		);
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		await updateSession(ctx.from.id, {
			lastMessageId: ctx.session.lastMessageId,
		});
	}
};

module.exports = { handleQuestionText };
