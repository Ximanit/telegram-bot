const { createBackKeyboard } = require('../../keyboards');
const { MESSAGES, SESSION_KEYS } = require('../../constants');
const { sendOrEditMessage } = require('../utils');

const handleHelp = async (ctx) => {
	ctx.session[SESSION_KEYS.AWAITING_SUPPORT_QUESTION] = true;
	await sendOrEditMessage(
		ctx,
		'Пожалуйста, опишите ваш вопрос для технической поддержки:',
		createBackKeyboard(),
		1
	);
};

module.exports = { handleHelp };
