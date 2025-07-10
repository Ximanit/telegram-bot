const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage } = require('../utils');

const handleStart = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
	ctx.session[SESSION_KEYS.HISTORY] = [];
	await sendOrEditMessage(
		ctx,
		MESSAGES.start.replace('%s', userName),
		createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
		true
	);
};

module.exports = { handleStart };
