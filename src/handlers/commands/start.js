const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage } = require('../utils');
const { handleAdmin } = require('./admin');

const handleStart = async (ctx) => {
	if (ctx.from.id.toString() === process.env.ADMIN_ID) {
		handleAdmin(ctx);
	} else {
		const userName = ctx.from?.first_name || 'Друг';
		ctx.session[SESSION_KEYS.AWAITING_QUESTION] = false;
		await sendOrEditMessage(
			ctx,
			MESSAGES.start.replace('%s', userName),
			createStartKeyboard(ctx.session[SESSION_KEYS.QUESTION_COUNT]),
			true
		);
	}
};

module.exports = { handleStart };
