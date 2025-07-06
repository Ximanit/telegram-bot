const fs = require('fs').promises;
const path = require('path');

const SUPPORT_QUESTIONS_FILE = path.join(
	__dirname,
	'../data/support_questions.json'
);

async function initSupportQuestionsFile() {
	try {
		await fs.access(SUPPORT_QUESTIONS_FILE);
	} catch {
		await fs.writeFile(SUPPORT_QUESTIONS_FILE, JSON.stringify([], null, 2));
	}
}

async function getSupportQuestions() {
	try {
		await initSupportQuestionsFile();
		const data = await fs.readFile(SUPPORT_QUESTIONS_FILE, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Ошибка чтения support_questions.json:', error);
		return [];
	}
}

async function addSupportQuestion(userId, username, text) {
	try {
		const questions = await getSupportQuestions();
		const newQuestion = {
			id: questions.length + 1,
			userId,
			username: username || `ID ${userId}`,
			text,
			status: 'pending',
			dialogue: [],
			timestamp: new Date().toISOString(),
		};
		questions.push(newQuestion);
		await fs.writeFile(
			SUPPORT_QUESTIONS_FILE,
			JSON.stringify(questions, null, 2)
		);
		return newQuestion;
	} catch (error) {
		console.error('Ошибка добавления вопроса техподдержки:', error);
		throw error;
	}
}

async function updateSupportQuestionStatus(id, status) {
	try {
		const questions = await getSupportQuestions();
		const question = questions.find((q) => q.id === id);
		if (question) {
			question.status = status;
			await fs.writeFile(
				SUPPORT_QUESTIONS_FILE,
				JSON.stringify(questions, null, 2)
			);
			return question;
		}
		return null;
	} catch (error) {
		console.error('Ошибка обновления статуса вопроса техподдержки:', error);
		throw error;
	}
}

async function addSupportDialogueMessage(questionId, sender, message) {
	try {
		const questions = await getSupportQuestions();
		const question = questions.find((q) => q.id === questionId);
		if (question) {
			question.dialogue.push({
				sender: sender === 'admin' ? 'Администратор' : 'Пользователь',
				message,
				timestamp: new Date().toISOString(),
			});
			await fs.writeFile(
				SUPPORT_QUESTIONS_FILE,
				JSON.stringify(questions, null, 2)
			);
			return question;
		}
		return null;
	} catch (error) {
		console.error('Ошибка добавления сообщения в диалог техподдержки:', error);
		throw error;
	}
}

module.exports = {
	getSupportQuestions,
	addSupportQuestion,
	updateSupportQuestionStatus,
	addSupportDialogueMessage,
};
