const { connectDB } = require('../db');
const { ObjectId } = require('mongodb');
const logger = require('../logger');

async function getQuestions() {
	try {
		const db = await connectDB();
		const questions = await db.collection('questions').find({}).toArray();
		logger.info(`Fetched ${questions.length} questions from MongoDB`);
		return questions;
	} catch (error) {
		logger.error('Ошибка чтения вопросов из MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

async function addQuestion(userId, username, text) {
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
		const result = await db.collection('questions').insertOne(newQuestion);
		logger.info(
			`Added question by user ${userId}: ${text}, _id: ${result.insertedId}`
		);
		return { ...newQuestion, _id: result.insertedId };
	} catch (error) {
		logger.error('Ошибка добавления вопроса в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updateQuestionStatus(_id, status, rejectReason = null) {
	try {
		const db = await connectDB();
		const questionId = typeof _id === 'string' ? new ObjectId(_id) : _id;

		// Поиск документа
		const question = await db
			.collection('questions')
			.findOne({ _id: questionId });
		if (!question) {
			logger.warn(`Question with _id ${_id} not found`);
			return null;
		}

		// Обновление документа
		const updateFields = { status };
		if (rejectReason) updateFields.rejectReason = rejectReason;

		const result = await db
			.collection('questions')
			.updateOne({ _id: questionId }, { $set: updateFields });

		if (result.matchedCount === 0) {
			logger.warn(`Question with _id ${_id} not found during update`);
			return null;
		}

		// Повторный поиск для возврата обновленного документа
		const updatedQuestion = await db
			.collection('questions')
			.findOne({ _id: questionId });
		logger.info(`Question ${_id} updated, status: ${status}`);
		return updatedQuestion;
	} catch (error) {
		logger.error('Ошибка обновления статуса вопроса в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function addDialogueMessage(_id, sender, message) {
	try {
		const db = await connectDB();
		const questionId = typeof _id === 'string' ? new ObjectId(_id) : _id;

		// Поиск документа
		const question = await db
			.collection('questions')
			.findOne({ _id: questionId });
		if (!question) {
			logger.warn(`Question with _id ${_id} not found`);
			return null;
		}

		// Обновление документа
		const result = await db.collection('questions').updateOne(
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
			logger.warn(`Question with _id ${_id} not found during update`);
			return null;
		}

		// Повторный поиск для возврата обновленного документа
		const updatedQuestion = await db
			.collection('questions')
			.findOne({ _id: questionId });
		logger.info(`Added dialogue message to question ${_id} by ${sender}`);
		return updatedQuestion;
	} catch (error) {
		logger.error('Ошибка добавления сообщения в диалог вопроса:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

module.exports = {
	getQuestions,
	addQuestion,
	updateQuestionStatus,
	addDialogueMessage,
};
