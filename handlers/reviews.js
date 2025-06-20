const fs = require('fs').promises;
const path = require('path');

const REVIEWS_FILE = path.join(__dirname, 'reviews.json');

// Инициализация файла отзывов, если он не существует
async function initReviewsFile() {
	try {
		await fs.access(REVIEWS_FILE);
		console.log('Файл reviews.json существует');
	} catch {
		console.log('Создаем новый файл reviews.json');
		await fs.writeFile(REVIEWS_FILE, JSON.stringify([], null, 2));
	}
}

// Получение всех отзывов
async function getReviews() {
	try {
		await initReviewsFile();
		const data = await fs.readFile(REVIEWS_FILE, 'utf8');
		const reviews = JSON.parse(data);
		console.log('Отзывы из файла:', reviews); // Отладка: выводим содержимое файла
		if (!Array.isArray(reviews)) {
			console.error(
				'reviews.json содержит некорректные данные, ожидаем массив'
			);
			return [];
		}
		return reviews;
	} catch (error) {
		console.error('Ошибка чтения reviews.json:', error);
		return [];
	}
}

// Добавление нового отзыва
async function addReview(userId, username, text) {
	try {
		const reviews = await getReviews();
		const newReview = {
			id: reviews.length + 1,
			userId,
			username: username || `ID ${userId}`,
			text,
			approved: false,
			timestamp: new Date().toISOString(),
		};
		reviews.push(newReview);
		await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
		console.log('Добавлен отзыв:', newReview); // Отладка: выводим добавленный отзыв
		return newReview;
	} catch (error) {
		console.error('Ошибка добавления отзыва:', error);
		throw error;
	}
}

// Обновление статуса отзыва (одобрить/отклонить)
async function updateReviewStatus(id, approved) {
	try {
		const reviews = await getReviews();
		const review = reviews.find((r) => r.id === id);
		if (review) {
			review.approved = approved;
			await fs.writeFile(REVIEWS_FILE, JSON.stringify(reviews, null, 2));
			console.log(`Отзыв ${id} обновлен, approved: ${approved}`); // Отладка
			return review;
		}
		console.warn(`Отзыв с id ${id} не найден`);
		return null;
	} catch (error) {
		console.error('Ошибка обновления статуса отзыва:', error);
		throw error;
	}
}

module.exports = { getReviews, addReview, updateReviewStatus };
