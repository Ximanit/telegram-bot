const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');

const handleStart = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	ctx.session.lastAction = null;
	ctx.session.history = [];
	await sendOrEditMessage(
		ctx,
		MESSAGES.start.replace('%s', userName),
		createStartKeyboard(ctx.session.questionCount),
		true
	);
};

module.exports = { handleStart };
