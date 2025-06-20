const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleStart = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	ctx.session.lastAction = null;
	await ctx.reply(MESSAGES.start.replace('%s', userName), {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

module.exports = { handleStart };
