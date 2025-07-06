const { createBackKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { sendOrEditMessage } = require('../utils');

const handleHelp = async (ctx) => {
	ctx.session.awaitingSupportQuestion = true;
	await sendOrEditMessage(
		ctx,
		'Пожалуйста, опишите ваш вопрос для технической поддержки:',
		createBackKeyboard(),
		1
	);
};

module.exports = { handleHelp };
