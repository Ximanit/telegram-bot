const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleMeow = async (ctx) => {
	await ctx.reply(MESSAGES.meow, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

module.exports = { handleMeow };
