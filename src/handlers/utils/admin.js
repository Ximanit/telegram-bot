const { connectDB } = require('../../db');
const { sendOrEditMessage, sendMessageToUser } = require('../utils');
const logger = require('../../logger');
const { SESSION_KEYS } = require('../../constants');

const handleAdminAnswer = async (ctx, questionId, answer, config) => {
	const { addMessage, userKeyboard, collection, successMessage } = config;
	const question = await addMessage(questionId, 'admin', answer);
	if (!question) {
		await sendOrEditMessage(
			ctx,
			'Ошибка: вопрос не найден.',
			config.backKeyboard,
			true
		);
		logger.error(`${collection} ${questionId} не найдено для ответа`);
		return;
	}

	await sendMessageToUser(
		question.userId,
		`Сообщение от администратора по вашему ${successMessage} #${questionId}:\n${answer}`,
		userKeyboard(questionId),
		ctx
	);

	await sendOrEditMessage(
		ctx,
		'Сообщение отправлено пользователю.',
		config.backKeyboard,
		true
	);
	ctx.session[SESSION_KEYS.AWAITING_ANSWER] = false;
	logger.info(
		`Администратор дал ответ ${collection} ${questionId} для пользователя ${question.userId}`
	);
};

module.exports = { handleAdminAnswer };
