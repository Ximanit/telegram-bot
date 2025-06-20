const { createStartKeyboard, createBackKeyboard } = require('../keyboards');
const { MESSAGES } = require('../constants');

const handleStart = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	ctx.session.lastAction = null;
	await ctx.reply(MESSAGES.start.replace('%s', userName), {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

const handleMeow = async (ctx) => {
	await ctx.reply(MESSAGES.meow, {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

const handleHelp = async (ctx) => {
	await ctx.reply(MESSAGES.help, {
		parse_mode: 'Markdown',
		reply_markup: createBackKeyboard(),
	});
};

module.exports = { handleStart, handleMeow, handleHelp };
