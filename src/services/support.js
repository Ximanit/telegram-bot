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
		logger.info(`${questions.length} вопросов поддержки были получены из базы`);
		return questions;
	} catch (error) {
		logger.error('Ошибка чтения вопросов техподдержки из MongoDB:', {
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
			`Был добавлен новый вопрос технической поддержки от пользователя ${userId}: ${text}, _id: ${result.insertedId}`
		);
		return { ...newQuestion, _id: result.insertedId };
	} catch (error) {
		logger.error('Ошибка добавления вопроса техподдержки в MongoDB:', {
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
			logger.warn(`Вопрос технической поддежрки с  _id ${_id} не найден`);
			return null;
		}

		const result = await db
			.collection('support_questions')
			.updateOne({ _id: questionId }, { $set: { status } });

		if (result.matchedCount === 0) {
			logger.warn(`Вопрос технической поддежрки с  _id ${_id} не найден`);
			return null;
		}

		const updatedQuestion = await db
			.collection('support_questions')
			.findOne({ _id: questionId });
		logger.info(
			`Вопрос технической поддержки  ${_id} обновлен, статус: ${status}`
		);
		return updatedQuestion;
	} catch (error) {
		logger.error('Ошибка обновления статуса вопроса техподдержки в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
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
			logger.warn(`Вопрос технической поддежрки с  _id ${_id} не найден`);
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
				`Вопрос технической поддежрки с  _id ${_id} не найден для обновления`
			);
			return null;
		}

		const updatedQuestion = await db
			.collection('support_questions')
			.findOne({ _id: questionId });
		logger.info(
			`В диалог по вопросу добавлено новое сообщение ${_id} от ${sender}`
		);
		return updatedQuestion;
	} catch (error) {
		logger.error('Ошибка добавления сообщения в диалог техподдержки:', {
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
			` ${questions.length} вопросов технической поддержки были получены из базы данных`
		);
		return questions;
	} catch (error) {
		logger.error('Ошибка чтения processing вопросов техподдержки из MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
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
