const { connectDB } = require('../db');
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
			id: (await db.collection('reviews').countDocuments()) + 1,
			userId,
			username: username || `ID ${userId}`,
			text,
			approved: false,
			timestamp: new Date().toISOString(),
		};
		await db.collection('reviews').insertOne(newReview);
		logger.info(`Added review by user ${userId}: ${text}`);
		return newReview;
	} catch (error) {
		logger.error('Ошибка добавления отзыва в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

async function updateReviewStatus(id, approved) {
	try {
		const db = await connectDB();
		const result = await db
			.collection('reviews')
			.findOneAndUpdate(
				{ id },
				{ $set: { approved } },
				{ returnDocument: 'after' }
			);
		if (result.value) {
			logger.info(`Review ${id} updated, approved: ${approved}`);
			return result.value;
		}
		logger.warn(`Review with id ${id} not found`);
		return null;
	} catch (error) {
		logger.error('Ошибка обновления статуса отзыва в MongoDB:', {
			error: error.message,
			stack: error.stack,
		});
		throw error;
	}
}

module.exports = { getReviews, addReview, updateReviewStatus };
