const { connectDB } = require('../db');
const logger = require('../logger');

async function getSupportQuestions() {
	try {
		const db = await connectDB();
		const questions = await db
			.collection('support_questions')
			.find({})
			.toArray();
		logger.info(`Fetched ${questions.length} support questions from MongoDB`);
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
			id: (await db.collection('support_questions').countDocuments()) + 1,
			userId,
			username: username || `ID ${userId}`,
			text,
			status: 'pending',
			dialogue: [],
			timestamp: new Date().toISOString(),
		};
		await db.collection('support_questions').insertOne(newQuestion);
		logger.info(`Added support question by user ${userId}: ${text}`);
		return newQuestion;
	} catch (error) {
		logger.error('Ошибка добавления вопроса техподдержки в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updateSupportQuestionStatus(id, status) {
	try {
		const db = await connectDB();
		const result = await db
			.collection('support_questions')
			.findOneAndUpdate(
				{ id },
				{ $set: { status } },
				{ returnDocument: 'after' }
			);
		if (result.value) {
			logger.info(`Support question ${id} updated, status: ${status}`);
			return result.value;
		}
		logger.warn(`Support question with id ${id} not found`);
		return null;
	} catch (error) {
		logger.error('Ошибка обновления статуса вопроса техподдержки в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function addSupportDialogueMessage(questionId, sender, message) {
	try {
		const db = await connectDB();
		const result = await db.collection('support_questions').findOneAndUpdate(
			{ id: questionId },
			{
				$push: {
					dialogue: {
						sender: sender === 'admin' ? 'Администратор' : 'Пользователь',
						message,
						timestamp: new Date().toISOString(),
					},
				},
			},
			{ returnDocument: 'after' }
		);
		if (result.value) {
			logger.info(
				`Added dialogue message to support question ${questionId} by ${sender}`
			);
			return result.value;
		}
		logger.warn(`Support question with id ${questionId} not found`);
		return null;
	} catch (error) {
		logger.error('Ошибка добавления сообщения в диалог техподдержки:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

module.exports = {
	getSupportQuestions,
	addSupportQuestion,
	updateSupportQuestionStatus,
	addSupportDialogueMessage,
};
