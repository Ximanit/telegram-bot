const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
require('dotenv').config();

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		// Логи ошибок с ротацией
		new DailyRotateFile({
			filename: 'logs/error-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			level: 'error',
			maxFiles: '14d', // Хранить логи за последние 14 дней
			maxSize: '20m', // Максимальный размер файла 20 МБ
			zippedArchive: true, // Сжимать старые файлы в .gz
		}),
		// Общие логи с ротацией
		new DailyRotateFile({
			filename: 'logs/combined-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			maxFiles: '14d', // Хранить логи за последние 14 дней
			maxSize: '20m', // Максимальный размер файла 20 МБ
			zippedArchive: true, // Сжимать старые файлы в .gz
		}),
		// Вывод логов в консоль для разработки
		new winston.transports.Console({
			format: winston.format.simple(),
			level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
		}),
	],
});

module.exports = logger;
