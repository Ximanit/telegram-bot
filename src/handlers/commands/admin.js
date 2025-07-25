const { MESSAGES } = require('../../constants');
const {
	createAdminMenuKeyboard,
	createBackKeyboard,
} = require('../../keyboards');
const { sendOrEditMessage } = require('../utils');

const handleAdmin = async (ctx) => {
	if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
		await sendOrEditMessage(
			ctx,
			MESSAGES.admniEnterClose,
			createBackKeyboard(),
			true
		);
		return;
	} else {
		await sendOrEditMessage(
			ctx,
			MESSAGES.enterAdmin,
			createAdminMenuKeyboard(),
			true
		);
	}
};

module.exports = { handleAdmin };
