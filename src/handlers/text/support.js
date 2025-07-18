const {
	createStartKeyboard,
	createBackKeyboard,
	createSupportQuestionActionKeyboard,
	createUserSupportQuestionActionKeyboard,
} = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const {
	addSupportQuestion,
	addSupportDialogueMessage,
	getSupportQuestions,
} = require('../../services/support');
const { ObjectId } = require('mongodb');
const { sendOrEditMessage } = require('../utils');

const validateSupportQuestion = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleSupportQuestionText = async (ctx) => {
	if (ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION]) {
		const question = validateSupportQuestion(ctx.message.text);
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
		const newQuestion = await addSupportQuestion(
			ctx.from.id,
			ctx.from.username,
			question
		);

		// await ctx.api.sendMessage(
		// 	process.env.ADMIN_ID,
		// 	`Новый вопрос техподдержки от ${userInfo} (${userName}):\n${question}`,
		// 	{
		// 		parse_mode: 'Markdown',
		// 		reply_markup: createSupportQuestionActionKeyboard(
		// 			newQuestion._id.toString()
		// 		),
		// 	}
		// );

		ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION] = false;
		ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] =
			newQuestion._id.toString();
		const sentMessage = await sendOrEditMessage(
			ctx,
			MESSAGES.supportQuestionSent,
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
			true
		);
		ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
			sentMessage.message_id;
	} else if (ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID]) {
		const question = (await getSupportQuestions()).find(
			(q) =>
				q._id.toString() ===
					ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] &&
				q.status === 'in_progress'
		);
		if (question) {
			// const userInfo = ctx.from.username
			// 	? `@${ctx.from.username}`
			// 	: `ID ${ctx.from.id}`;
			// const userName = ctx.from?.first_name || 'Пользователь';
			await addSupportDialogueMessage(question._id, 'user', ctx.message.text);
			// await ctx.api.sendMessage(
			// 	process.env.ADMIN_ID,
			// 	`Сообщение от ${userInfo} (${userName}) по вопросу техподдержки #${question._id}:\n${ctx.message.text}`,
			// 	{
			// 		parse_mode: 'Markdown',
			// 		reply_markup: createSupportQuestionActionKeyboard(
			// 			question._id.toString()
			// 		),
			// 	}
			// );
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.dialogueMessageSent,
				createUserSupportQuestionActionKeyboard(question._id.toString()),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
		} else {
			ctx.session[SESSION_KEYS.CURRENT_SUPPORT_QUESTION_ID] = null;
			const sentMessage = await sendOrEditMessage(
				ctx,
				MESSAGES.dialogSupportMessagesFinish,
				createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
				true
			);
			ctx.session[SESSION_KEYS.LAST_MESSAGE_ID][ctx.chat.id] =
				sentMessage.message_id;
		}
	}
};

module.exports = { handleSupportQuestionText };
