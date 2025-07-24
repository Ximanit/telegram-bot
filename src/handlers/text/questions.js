const {
	createStartKeyboard,
	createBackKeyboard,
	createBackKeyboardADmin,
} = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const {
	addQuestion,
	addDialogueMessage,
	getQuestions,
} = require('../../services/questions');
const logger = require('../../logger');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');

const validateQuestion = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleQuestionText = async (ctx) => {
	if (ctx.session[SESSION_KEYS.AWAITING_QUESTION]) {
		if (ctx.session[SESSION_KEYS.QUESTION_COUNT] <= 0) {
			ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.noQuestionService,
				createBackKeyboard(),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			return;
		}

		const question = validateQuestion(ctx.message.text);
		if (!question) {
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.questionTooShort,
				createBackKeyboard(),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			return;
		}

		// const userInfo = ctx.from.username
		// 	? `@${ctx.from.username}`
		// 	: `ID ${ctx.from.id}`;
		// const userName = ctx.from?.first_name || 'Пользователь';
		const newQuestion = await addQuestion(
			ctx.from.id,
			ctx.from.username,
			question
		);

		// await ctx.api.sendMessage(
		// 	process.env.ADMIN_ID,
		// 	`Новый вопрос от ${userInfo} (${userName}):\n${question}`,
		// 	{
		// 		parse_mode: 'Markdown',
		// 		reply_markup: createQuestionActionKeyboard(newQuestion._id.toString()),
		// 	}
		// );

		ctx.session[SESSION_KEYS.QUESTION_COUNT] -= 1;
		ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
		ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = newQuestion._id.toString();
		const sentMessage = await sendOrEditMessage(
			ctx,
			`${MESSAGES.questionSent}\nОсталось вопросов: ${
				ctx.session[SESSION_KEYS.QUESTION_COUNT]
			}`,
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
			true
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
	} else if (
		ctx.session[SESSION_KEYS.AWAITING_ANSWER] &&
		ctx.from.id.toString() === process.env.ADMIN_ID
	) {
		const questionId = ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID];
		const answer = ctx.message.text;
		const question = await addDialogueMessage(questionId, 'admin', answer);
		if (question) {
			await sendMessageToUser(
				question.userId,
				`${MESSAGES.newAdminMessage}\n${answer}`,
				createBackKeyboard(),
				ctx
			);

			const adminMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.messageSendUser,
				createBackKeyboardADmin(),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				adminMessage.message_id;
			ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
			logger.info(
				`Администратор ответил на вопрос ${questionId} пользователя ${question.userId}`
			);
		} else {
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.questionNotFound,
				createBackKeyboard(),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
			logger.error(`Вопрос ${questionId} не найден для ответа`);
		}
	} else if (ctx.session[SESSION_KEYS.AWAITING_QUESTION_CLARIFICATION]) {
		const question = (await getQuestions()).find(
			(q) =>
				q._id.toString() === ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] &&
				q.status === 'in_progress'
		);
		if (question) {
			await addDialogueMessage(question._id, 'user', ctx.message.text);
			// await ctx.api.sendMessage(
			// 	process.env.ADMIN_ID,
			// 	`Сообщение от ${userInfo} (${userName}) по вопросу #${question._id}:\n${ctx.message.text}`,
			// 	{
			// 		parse_mode: 'Markdown',
			// 		reply_markup: createQuestionActionKeyboard(question._id.toString()),
			// 	}
			// );
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.dialogueMessageSent,
				createBackKeyboard(),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
		} else {
			ctx.session[SESSION_KEYS.CURRENT_QUESTION_ID] = null;
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.dialogFinishOrNotFound,
				createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
		}
	} else {
		const sentMessage = await sendOrEditMessage(
			ctx,
			MESSAGES.unknownMessage,
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
			true
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
	}
};

module.exports = { handleQuestionText };
