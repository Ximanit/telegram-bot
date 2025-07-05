const { createBackKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleHelp = async (ctx) => {
	const sentMessage = await ctx.reply(MESSAGES.help, {
		parse_mode: 'Markdown',
		reply_markup: createBackKeyboard(),
	});
	ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
};

module.exports = { handleHelp };
