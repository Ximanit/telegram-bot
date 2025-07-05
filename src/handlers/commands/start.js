const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleStart = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	ctx.session.lastAction = null;
	ctx.session.history = []; // Очищаем историю при старте
	const sentMessage = await ctx.reply(MESSAGES.start.replace('%s', userName), {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(ctx.session.questionCount),
	});
	ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
};

module.exports = { handleStart };
