const { MongoClient } = require('mongodb');
const logger = require('./logger');
require('dotenv').config();

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
		console.log('Подключение к MongoDB установлено');
		return db;
	} catch (error) {
		console.error('Ошибка подключения к MongoDB:', error);
		throw error;
	}
}

async function closeDB() {
	if (client) {
		await client.close();
		db = null;
		console.log('Подключение к MongoDB закрыто');
	}
}

async function updateSession(userId, updates) {
	const db = await connectDB();
	const session = await client.startSession();
	try {
		await session.withTransaction(async () => {
			const sessions = db.collection('sessions');
			const currentSession = await sessions.findOne(
				{ key: userId.toString() },
				{ session }
			);
			if (currentSession) {
				await sessions.updateOne(
					{ key: userId.toString() },
					{ $set: { value: { ...currentSession.value, ...updates } } },
					{ session }
				);
				logger.info(`Session updated for user ${userId}`);
			} else {
				logger.warn(`Session for user ${userId} not found`);
			}
		});
	} catch (error) {
		logger.error(
			`Error updating session for user ${userId}: ${error.message}`,
			{
				stack: error.stack,
			}
		);
		throw error;
	} finally {
		await session.endSession();
	}
}

module.exports = { connectDB, closeDB, updateSession };
