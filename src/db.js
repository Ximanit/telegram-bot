const { MongoClient } = require('mongodb');
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

module.exports = { connectDB, closeDB };
