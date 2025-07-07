const { connectDB } = require('../db');
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
			id: (await db.collection('questions').countDocuments()) + 1,
			userId,
			username: username || `ID ${userId}`,
			text,
			status: 'pending',
			rejectReason: null,
			dialogue: [],
			timestamp: new Date().toISOString(),
		};
		await db.collection('questions').insertOne(newQuestion);
		logger.info(`Added question by user ${userId}: ${text}`);
		return newQuestion;
	} catch (error) {
		logger.error('Ошибка добавления вопроса в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updateQuestionStatus(id, status, rejectReason = null) {
	try {
		const db = await connectDB();
		const updateFields = { status };
		if (rejectReason) updateFields.rejectReason = rejectReason;
		const result = await db
			.collection('questions')
			.findOneAndUpdate(
				{ id },
				{ $set: updateFields },
				{ returnDocument: 'after' }
			);
		if (result.value) {
			logger.info(`Question ${id} updated, status: ${status}`);
			return result.value;
		}
		logger.warn(`Question with id ${id} not found`);
		return null;
	} catch (error) {
		logger.error('Ошибка обновления статуса вопроса в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function addDialogueMessage(questionId, sender, message) {
	try {
		const db = await connectDB();
		const result = await db.collection('questions').findOneAndUpdate(
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
				`Added dialogue message to question ${questionId} by ${sender}`
			);
			return result.value;
		}
		logger.warn(`Question with id ${questionId} not found`);
		return null;
	} catch (error) {
		logger.error('Ошибка добавления сообщения в диалог:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

const hasQuestionService = (session) => {
	return session.paidServices?.some(
		(s) => s.id === 'single_question' && (session.questionCount || 0) < 1
	);
};

module.exports = {
	hasQuestionService,
	addQuestion,
	updateQuestionStatus,
	getQuestions,
	addDialogueMessage,
};
