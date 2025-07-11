const { connectDB } = require('../db');
const { ObjectId, GridFSBucket } = require('mongodb');
const axios = require('axios');
const logger = require('../logger');

async function getPayments() {
	try {
		const db = await connectDB();
		const payments = await db.collection('payments').find({}).toArray();
		logger.info('Fetched payments', { count: payments.length });
		return payments;
	} catch (error) {
		logger.error('Ошибка чтения платежей из MongoDB', {
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
			userId,
			username: username || `ID ${userId}`,
			cart,
			total,
			status: 'pending',
			photoFileId: null,
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
	photoFileId = null,
	rejectReason = null
) {
	try {
		const db = await connectDB();
		const collection = db.collection('payments');
		const paymentId = typeof _id === 'string' ? new ObjectId(_id) : _id;

		const payment = await collection.findOne({ _id: paymentId });
		if (!payment) {
			logger.warn('Payment not found', { paymentId });
			return null;
		}

		const updateFields = { status };
		if (photoFileId) updateFields.photoFileId = photoFileId;
		if (rejectReason) updateFields.rejectReason = rejectReason;

		const result = await collection.updateOne(
			{ _id: paymentId },
			{ $set: updateFields }
		);

		if (result.matchedCount === 0) {
			logger.warn('Payment not found during update', { paymentId });
			return null;
		}

		const updatedPayment = await collection.findOne({ _id: paymentId });
		logger.info('Payment updated', { paymentId, status });
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

async function savePaymentPhoto(fileId, paymentId, ctx) {
	try {
		const db = await connectDB();
		const bucket = new GridFSBucket(db, { bucketName: 'payment_photos' });

		const file = await ctx.api.getFile(fileId);
		const fileUrl = `https://api.telegram.org/file/bot${process.env.API_KEY}/${file.file_path}`;
		const response = await axios.get(fileUrl, { responseType: 'stream' });

		const stream = bucket.openUploadStream(
			`payment_${paymentId}_${Date.now()}.jpg`,
			{
				metadata: { paymentId, userId: ctx.from.id },
			}
		);

		await new Promise((resolve, reject) => {
			response.data.pipe(stream).on('finish', resolve).on('error', reject);
		});

		logger.info('Saved payment photo to GridFS', {
			paymentId,
			fileId: stream.id,
		});
		return stream.id.toString();
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
};
