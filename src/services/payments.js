const { ObjectId } = require('mongodb');
const { connectDB } = require('../db');
const logger = require('../logger');

async function addPayment(userId, username, cart, total) {
	try {
		const db = await connectDB();
		const newPayment = {
			userId,
			username: username || `ID ${userId}`,
			cart,
			total,
			status: 'pending',
			telegramFileId: null,
			rejectReason: null,
			timestamp: new Date().toISOString(),
			questionCount: cart.reduce(
				(count, item) =>
					item.id === 'single_question' ? count + item.quantity : count,
				0
			),
		};
		const result = await db.collection('payments').insertOne(newPayment);
		logger.info('Added payment', {
			userId,
			total,
			paymentId: result.insertedId,
		});
		return { ...newPayment, _id: result.insertedId };
	} catch (error) {
		logger.error('Ошибка добавления платежа в MongoDB', {
			error: error.message,
			stack: error.stack,
			userId,
		});
		throw error;
	}
}

async function updatePaymentStatus(
	_id,
	status,
	telegramFileId = null,
	rejectReason = null
) {
	try {
		const db = await connectDB();
		const collection = db.collection('payments');
		const paymentId = typeof _id === 'string' ? new ObjectId(_id) : _id;

		const payment = await collection.findOne({ _id: paymentId });
		if (!payment) {
			logger.warn('Платеж не найден', { paymentId });
			return null;
		}

		const updateFields = { status };
		if (telegramFileId) updateFields.telegramFileId = telegramFileId;
		if (rejectReason) updateFields.rejectReason = rejectReason;

		const result = await collection.updateOne(
			{ _id: paymentId },
			{ $set: updateFields }
		);

		if (result.matchedCount === 0) {
			logger.warn('Платеж не найден при обновлении', { paymentId });
			return null;
		}

		const updatedPayment = await collection.findOne({ _id: paymentId });
		logger.info('Платеж обновлен', {
			paymentId,
			status,
			telegramFileId,
		});
		return updatedPayment;
	} catch (error) {
		logger.error('Ошибка обновления статуса платежа в MongoDB', {
			error: error.message,
			stack: error.stack,
			paymentId: _id,
		});
		throw error;
	}
}

async function getPayments() {
	try {
		const db = await connectDB();
		const payments = await db.collection('payments').find({}).toArray();
		logger.info(`Получено ${payments.length} платежей`, {
			count: payments.length,
		});
		return payments;
	} catch (error) {
		logger.error('Ошибка чтения платежей из MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

async function getPendingPayments() {
	try {
		const db = await connectDB();
		const payments = await db
			.collection('payments')
			.find({ status: 'pending' })
			.toArray();
		logger.info(`Получено ${payments.length} ожидающих платежей из MongoDB`);
		return payments;
	} catch (error) {
		logger.error('Ошибка чтения ожидающих платежей из MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

async function savePaymentPhoto(fileId, paymentId, ctx) {
	try {
		logger.info('Фото платежа сохранено', {
			paymentId,
			telegramFileId: fileId,
		});
		return fileId;
	} catch (error) {
		logger.error('Ошибка сохранения фото платежа', {
			error: error.message,
			stack: error.stack,
			paymentId,
			userId: ctx.from.id,
		});
		throw error;
	}
}

module.exports = {
	addPayment,
	updatePaymentStatus,
	getPayments,
	savePaymentPhoto,
	getPendingPayments,
};
