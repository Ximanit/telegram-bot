const fs = require('fs').promises;
const path = require('path');

const QUESTIONS_FILE = path.join(__dirname, '../data/questions.json');

async function initQuestionsFile() {
	try {
		await fs.access(QUESTIONS_FILE);
	} catch {
		await fs.writeFile(QUESTIONS_FILE, JSON.stringify([], null, 2));
	}
}

async function getQuestions() {
	try {
		await initQuestionsFile();
		const data = await fs.readFile(QUESTIONS_FILE, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Ошибка чтения questions.json:', error);
		return [];
	}
}

async function addQuestion(userId, username, text) {
	try {
		const questions = await getQuestions();
		const newQuestion = {
			id: questions.length + 1,
			userId,
			username: username || `ID ${userId}`,
			text,
			status: 'pending',
			rejectReason: null,
			dialogue: [],
			timestamp: new Date().toISOString(),
		};
		questions.push(newQuestion);
		await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
		return newQuestion;
	} catch (error) {
		console.error('Ошибка добавления вопроса:', error);
		throw error;
	}
}

async function updateQuestionStatus(id, status, rejectReason = null) {
	try {
		const questions = await getQuestions();
		const question = questions.find((q) => q.id === id);
		if (question) {
			question.status = status;
			if (rejectReason) question.rejectReason = rejectReason;
			await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
			return question;
		}
		return null;
	} catch (error) {
		console.error('Ошибка обновления статуса вопроса:', error);
		throw error;
	}
}

async function addDialogueMessage(questionId, sender, message) {
	try {
		const questions = await getQuestions();
		const question = questions.find((q) => q.id === questionId);
		if (question) {
			question.dialogue.push({
				sender: sender === 'admin' ? 'Администратор' : 'Пользователь',
				message,
				timestamp: new Date().toISOString(),
			});
			await fs.writeFile(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
			return question;
		}
		return null;
	} catch (error) {
		console.error('Ошибка добавления сообщения в диалог:', error);
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
