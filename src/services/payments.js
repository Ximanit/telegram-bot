const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { connectDB } = require('../db');
const logger = require('../logger');

const PAYMENTS_PHOTOS_DIR = path.join(__dirname, '../data/payments_photos');

async function initPaymentsPhotosDir() {
	try {
		await fs.access(PAYMENTS_PHOTOS_DIR);
	} catch {
		await fs.mkdir(PAYMENTS_PHOTOS_DIR, { recursive: true });
		logger.info('Created payments_photos directory');
	}
}

async function getPayments() {
	try {
		const db = await connectDB();
		const payments = await db.collection('payments').find({}).toArray();
		logger.info(`Fetched ${payments.length} payments from MongoDB`);
		return payments;
	} catch (error) {
		logger.error('Ошибка чтения платежей из MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

async function addPayment(userId, username, cart, total) {
	try {
		const db = await connectDB();
		const newPayment = {
			id: (await db.collection('payments').countDocuments()) + 1,
			userId,
			username: username || `ID ${userId}`,
			cart,
			total,
			status: 'pending',
			photo: null,
			rejectReason: null,
			timestamp: new Date().toISOString(),
			questionCount: cart.reduce(
				(count, item) =>
					item.id === 'single_question' ? count + item.quantity : count,
				0
			),
		};
		await db.collection('payments').insertOne(newPayment);
		logger.info(`Added payment by user ${userId}, total: ${total}`);
		return newPayment;
	} catch (error) {
		logger.error('Ошибка добавления платежа в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updatePaymentStatus(
	id,
	status,
	photo = null,
	rejectReason = null
) {
	try {
		const db = await connectDB();
		const collection = db.collection('payments');

		// Поиск платежа
		const payment = await collection.findOne({ id });
		if (!payment) {
			logger.warn(`Payment with id ${id} not found`);
			return null;
		}

		// Подготовка полей для обновления
		const updateFields = { status };
		if (photo) updateFields.photo = photo;
		if (rejectReason) updateFields.rejectReason = rejectReason;

		// Обновление платежа
		const result = await collection.updateOne({ id }, { $set: updateFields });

		if (result.matchedCount === 0) {
			logger.warn(`Payment with id ${id} not found during update`);
			return null;
		}

		// Получение обновленного документа
		const updatedPayment = await collection.findOne({ id });
		logger.info(`Payment ${id} updated, status: ${status}`);
		return updatedPayment;
	} catch (error) {
		logger.error('Ошибка обновления статуса платежа в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function savePaymentPhoto(fileId, paymentId, bot) {
	try {
		await initPaymentsPhotosDir();
		const file = await bot.api.getFile(fileId);
		const fileUrl = `https://api.telegram.org/file/bot${process.env.API_KEY}/${file.file_path}`;
		const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
		const photoPath = path.join(
			PAYMENTS_PHOTOS_DIR,
			`payment_${paymentId}_${Date.now()}.jpg`
		);
		await fs.writeFile(photoPath, response.data);
		logger.info(`Saved payment photo for payment ${paymentId}`);
		return photoPath;
	} catch (error) {
		logger.error('Ошибка сохранения фото платежа:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

module.exports = {
	addPayment,
	updatePaymentStatus,
	getPayments,
	savePaymentPhoto,
};
