const { MongoClient, ObjectId } = require('mongodb');
const logger = require('./logger');
require('dotenv').config();

const { SESSION_KEYS } = require('./constants');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'telegram_bot';

let client;
let db;

async function connectDB() {
	if (db) return db;
	try {
		client = new MongoClient(uri);
		await client.connect();
		db = client.db(dbName);
		logger.info('Подключение к MongoDB установлено');
		return db;
	} catch (error) {
		logger.error('Ошибка подключения к MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function closeDB() {
	if (client) {
		await client.close();
		db = null;
		logger.info('Подключение к MongoDB закрыто');
	}
}

async function updateSession(userId, updates) {
	const db = await connectDB();
	try {
		const sessions = db.collection('sessions');
		const currentSession = await sessions.findOne({ key: userId.toString() });
		if (currentSession) {
			await sessions.updateOne(
				{ key: userId.toString() },
				{ $set: { value: { ...currentSession.value, ...updates } } }
			);
			logger.info('Сессия обновлена', { userId });
		} else {
			logger.warn('Сессия не найдена', { userId });
		}
	} catch (error) {
		logger.error('Ошибка обновления сессии', {
			userId,
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function getUserSession(userId, ctx) {
	const db = await connectDB();
	const sessions = db.collection('sessions');
	const userSession = await sessions.findOne({ key: userId.toString() });
	if (!userSession) {
		logger.error(`Сессия пользователя: ${userId} не найдена`);
		await sendOrEditMessage(
			ctx,
			'Ошибка: сессия пользователя не найдена.',
			createBackKeyboard(),
			true
		);
		return null;
	}
	return userSession;
}

async function updateLastMessageId(userId, messageId) {
	await updateSession(userId, {
		[SESSION_KEYS.LAST_MESSAGE_ID]: {
			[userId]: messageId,
		},
	});
	logger.info(
		`Обновление LAST_MESSAGE_ID для пользователя ${userId}: ${messageId}`
	);
}

const getItemById = async (type, id) => {
	const collectionMap = {
		reviews: 'reviews',
		payments: 'payments',
		questions: 'questions',
		support: 'support_questions',
	};
	const collection = collectionMap[type];
	if (!collection) return null;
	return await db.collection(collection).findOne({ _id: new ObjectId(id) });
};

module.exports = {
	connectDB,
	closeDB,
	updateSession,
	getUserSession,
	updateLastMessageId,
	getItemById,
};
