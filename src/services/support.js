const { connectDB } = require('../db');
const { ObjectId } = require('mongodb');
const logger = require('../logger');

async function getSupportQuestions() {
	try {
		const db = await connectDB();
		const questions = await db
			.collection('support_questions')
			.find({})
			.toArray();
		logger.info(
			`Получено ${questions.length} вопросов технической поддержки из MongoDB`
		);
		return questions;
	} catch (error) {
		logger.error('Ошибка чтения вопросов технической поддержки из MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

async function addSupportQuestion(userId, username, text) {
	try {
		const db = await connectDB();
		const newQuestion = {
			userId,
			username: username || `ID ${userId}`,
			text,
			status: 'pending',
			dialogue: [],
			timestamp: new Date().toISOString(),
		};
		const result = await db
			.collection('support_questions')
			.insertOne(newQuestion);
		logger.info(
			`Добавлен вопрос технической поддержки от пользователя ${userId}: ${text}, _id: ${result.insertedId}`
		);
		return { ...newQuestion, _id: result.insertedId };
	} catch (error) {
		logger.error('Ошибка добавления вопроса технической поддержки в MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updateSupportQuestionStatus(_id, status) {
	try {
		const db = await connectDB();
		const questionId = typeof _id === 'string' ? new ObjectId(_id) : _id;

		const question = await db
			.collection('support_questions')
			.findOne({ _id: questionId });
		if (!question) {
			logger.warn(`Вопрос технической поддержки с _id ${_id} не найден`);
			return null;
		}

		const result = await db
			.collection('support_questions')
			.updateOne({ _id: questionId }, { $set: { status } });

		if (result.matchedCount === 0) {
			logger.warn(
				`Вопрос технической поддержки с _id ${_id} не найден при обновлении`
			);
			return null;
		}

		const updatedQuestion = await db
			.collection('support_questions')
			.findOne({ _id: questionId });
		logger.info(
			`Вопрос технической поддержки ${_id} обновлен, статус: ${status}`
		);
		return updatedQuestion;
	} catch (error) {
		logger.error(
			'Ошибка обновления статуса вопроса технической поддержки в MongoDB',
			{
				error: error.message,
				stack: error.stack,
			}
		);
		throw error;
	}
}

async function addSupportDialogueMessage(_id, sender, message) {
	try {
		const db = await connectDB();
		const questionId = typeof _id === 'string' ? new ObjectId(_id) : _id;

		const question = await db
			.collection('support_questions')
			.findOne({ _id: questionId });
		if (!question) {
			logger.warn(`Вопрос технической поддержки с _id ${_id} не найден`);
			return null;
		}

		const result = await db.collection('support_questions').updateOne(
			{ _id: questionId },
			{
				$push: {
					dialogue: {
						sender: sender === 'admin' ? 'Администратор' : 'Пользователь',
						message,
						timestamp: new Date().toISOString(),
					},
				},
			}
		);

		if (result.matchedCount === 0) {
			logger.warn(
				`Вопрос технической поддержки с _id ${_id} не найден при обновлении`
			);
			return null;
		}

		const updatedQuestion = await db
			.collection('support_questions')
			.findOne({ _id: questionId });
		logger.info(
			`Добавлено сообщение в диалог вопроса технической поддержки ${_id} от ${sender}`
		);
		return updatedQuestion;
	} catch (error) {
		logger.error('Ошибка добавления сообщения в диалог технической поддержки', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function getProcessingSupportQuestions() {
	try {
		const db = await connectDB();
		const questions = await db
			.collection('support_questions')
			.find({ status: { $in: ['pending', 'in_progress'] } })
			.toArray();
		logger.info(
			`Получено ${questions.length} вопросов технической поддержки в обработке из MongoDB`
		);
		return questions;
	} catch (error) {
		logger.error(
			'Ошибка чтения вопросов технической поддержки в обработке из MongoDB',
			{
				error: error.message,
				stack: error.stack,
			}
		);
		return [];
	}
}

module.exports = {
	getSupportQuestions,
	addSupportQuestion,
	updateSupportQuestionStatus,
	addSupportDialogueMessage,
	getProcessingSupportQuestions,
};
