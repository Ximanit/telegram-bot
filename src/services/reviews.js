const { connectDB } = require('../db');
const { ObjectId } = require('mongodb');
const logger = require('../logger');

async function getReviews() {
	try {
		const db = await connectDB();
		const reviews = await db.collection('reviews').find({}).toArray();
		logger.info(`Fetched ${reviews.length} reviews from MongoDB`);
		return reviews;
	} catch (error) {
		logger.error('Ошибка чтения отзывов из MongoDB:', {
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
			`Added review by user ${userId}: ${text}, _id: ${result.insertedId}`
		);
		return { ...newReview, _id: result.insertedId };
	} catch (error) {
		logger.error('Ошибка добавления отзыва в MongoDB:', {
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
			logger.warn(`Review with _id ${_id} not found`);
			return null;
		}
		const result = await db
			.collection('reviews')
			.updateOne({ _id: reviewId }, { $set: { status } });
		if (result.matchedCount === 0) {
			logger.warn(`Review with _id ${_id} not found during update`);
			return null;
		}
		const updatedReview = await db
			.collection('reviews')
			.findOne({ _id: reviewId });
		logger.info(`Review ${_id} updated, status: ${status}`);
		return updatedReview;
	} catch (error) {
		logger.error('Ошибка обновления статуса отзыва в MongoDB:', {
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
		logger.info(`Fetched ${reviews.length} pending reviews from MongoDB`);
		return reviews;
	} catch (error) {
		logger.error('Ошибка чтения pending отзывов из MongoDB:', {
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
