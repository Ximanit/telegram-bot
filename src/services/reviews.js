const { connectDB } = require('../db');
const { ObjectId } = require('mongodb');
const logger = require('../logger');

async function getReviews() {
	try {
		const db = await connectDB();
		const reviews = await db.collection('reviews').find({}).toArray();
		logger.info(`Получено ${reviews.length} отзывов из MongoDB`);
		return reviews;
	} catch (error) {
		logger.error('Ошибка чтения отзывов из MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

async function addReview(userId, username, text) {
	try {
		const db = await connectDB();
		const newReview = {
			userId,
			username: username || `ID ${userId}`,
			text,
			status: 'pending',
			timestamp: new Date().toISOString(),
		};
		const result = await db.collection('reviews').insertOne(newReview);
		logger.info(
			`Добавлен отзыв от пользователя ${userId}: ${text}, _id: ${result.insertedId}`
		);
		return { ...newReview, _id: result.insertedId };
	} catch (error) {
		logger.error('Ошибка добавления отзыва в MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updateReviewStatus(_id, status) {
	try {
		const db = await connectDB();
		const reviewId = typeof _id === 'string' ? new ObjectId(_id) : _id;
		const review = await db.collection('reviews').findOne({ _id: reviewId });
		if (!review) {
			logger.warn(`Отзыв с _id ${_id} не найден`);
			return null;
		}
		const result = await db
			.collection('reviews')
			.updateOne({ _id: reviewId }, { $set: { status } });
		if (result.matchedCount === 0) {
			logger.warn(`Отзыв с _id ${_id} не найден при обновлении`);
			return null;
		}
		const updatedReview = await db
			.collection('reviews')
			.findOne({ _id: reviewId });
		logger.info(`Отзыв ${_id} обновлен, статус: ${status}`);
		return updatedReview;
	} catch (error) {
		logger.error('Ошибка обновления статуса отзыва в MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function getPendingReviews() {
	try {
		const db = await connectDB();
		const reviews = await db
			.collection('reviews')
			.find({ status: 'pending' })
			.toArray();
		logger.info(`Получено ${reviews.length} ожидающих отзывов из MongoDB`);
		return reviews;
	} catch (error) {
		logger.error('Ошибка чтения ожидающих отзывов из MongoDB', {
			error: error.message,
			stack: error.stack,
		});
		return [];
	}
}

module.exports = {
	getReviews,
	addReview,
	updateReviewStatus,
	getPendingReviews,
};
