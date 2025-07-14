const {
	createAdminMenuKeyboard,
	createBackKeyboard,
} = require('../../keyboards');
const { sendOrEditMessage } = require('../utils');

const handleAdmin = async (ctx) => {
	if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
		await sendOrEditMessage(
			ctx,
			'У вас нет доступа к админ-панели.',
			createBackKeyboard(),
			true
		);
		return;
	} else {
		await sendOrEditMessage(
			ctx,
			'Добро пожаловать в админ-панель!\nВыберите раздел:',
			createAdminMenuKeyboard(),
			true
		);
	}
};

module.exports = { handleAdmin };
