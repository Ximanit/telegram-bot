const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleMeow = async (ctx) => {
	const sentMessage = await ctx.reply(MESSAGES.meow, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
	ctx.session.lastMessageId[ctx.chat.id] = sentMessage.message_id;
};

module.exports = { handleMeow };
