const { createBackKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleHelp = async (ctx) => {
	await ctx.reply(MESSAGES.help, {
		parse_mode: 'Markdown',
		reply_markup: createBackKeyboard(),
	});
};

module.exports = { handleHelp };
