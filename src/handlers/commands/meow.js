const { createStartKeyboard } = require('../../keyboards');
const { MESSAGES } = require('../../constants');
const { sendMeow } = require('../utils');

const handleMeow = async (ctx) => {
	await sendMeow(ctx);
};

module.exports = { handleMeow };
