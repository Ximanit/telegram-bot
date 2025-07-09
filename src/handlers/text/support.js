const {
	createStartKeyboard,
	createBackKeyboard,
	createSupportQuestionActionKeyboard,
	createUserSupportQuestionActionKeyboard,
} = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const {
	addSupportQuestion,
	addSupportDialogueMessage,
	getSupportQuestions,
} = require('../../services/support');
const { ObjectId } = require('mongodb');

const validateSupportQuestion = (text) => {
	const trimmed = text.trim();
	return trimmed.length >= 5 ? trimmed : null;
};

const handleSupportQuestionText = async (ctx) => {
	if (ctx.session.awaitingSupportQuestion) {
		const question = validateSupportQuestion(ctx.message.text);
		if (!question) {
			const sentMessage = await ctx.reply(MESSAGES.questionTooShort, {
				parse_mode: 'Markdown',
				reply_markup: createBackKeyboard(),
			});
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
			return;
		}

		const userInfo = ctx.from.username
			? `@${ctx.from.username}`
			: `ID ${ctx.from.id}`;
		const userName = ctx.from?.first_name || 'Пользователь';
		const newQuestion = await addSupportQuestion(
			ctx.from.id,
			ctx.from.username,
			question
		);

		await ctx.api.sendMessage(
			process.env.ADMIN_ID,
			`Новый вопрос техподдержки от ${userInfo} (${userName}):\n${question}`,
			{
				parse_mode: 'Markdown',
				reply_markup: createSupportQuestionActionKeyboard(
					newQuestion._id.toString()
				),
			}
		);

		ctx.session.awaitingSupportQuestion = false;
		ctx.session.currentSupportQuestionId = newQuestion._id.toString();
		const sentMessage = await ctx.reply(MESSAGES.supportQuestionSent, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(ctx.session.questionCount),
		});
		ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
	} else if (ctx.session.currentSupportQuestionId) {
		const question = (await getSupportQuestions()).find(
			(q) =>
				q._id.toString() === ctx.session.currentSupportQuestionId &&
				q.status === 'in_progress'
		);
		if (question) {
			const userInfo = ctx.from.username
				? `@${ctx.from.username}`
				: `ID ${ctx.from.id}`;
			const userName = ctx.from?.first_name || 'Пользователь';
			await addSupportDialogueMessage(question._id, 'user', ctx.message.text);
			await ctx.api.sendMessage(
				process.env.ADMIN_ID,
				`Сообщение от ${userInfo} (${userName}) по вопросу техподдержки #${question._id}:\n${ctx.message.text}`,
				{
					parse_mode: 'Markdown',
					reply_markup: createSupportQuestionActionKeyboard(
						question._id.toString()
					),
				}
			);
			const sentMessage = await ctx.reply(MESSAGES.dialogueMessageSent, {
				parse_mode: 'Markdown',
				reply_markup: createUserSupportQuestionActionKeyboard(
					question._id.toString()
				),
			});
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		} else {
			ctx.session.currentSupportQuestionId = null;
			const sentMessage = await ctx.reply(
				'Диалог по этому вопросу техподдержки завершен или вопрос не найден.',
				{
					parse_mode: 'Markdown',
					reply_markup: createStartKeyboard(ctx.session.questionCount),
				}
			);
			ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
		}
	}
};

module.exports = { handleSupportQuestionText };
