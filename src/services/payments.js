const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const PAYMENTS_FILE = path.join(__dirname, '../data/payments.json');
const PAYMENTS_PHOTOS_DIR = path.join(__dirname, '../data/payments_photos');

async function initPaymentsFile() {
	try {
		await fs.access(PAYMENTS_FILE);
	} catch {
		await fs.writeFile(PAYMENTS_FILE, JSON.stringify([], null, 2));
	}
}

async function initPaymentsPhotosDir() {
	try {
		await fs.access(PAYMENTS_PHOTOS_DIR);
	} catch {
		await fs.mkdir(PAYMENTS_PHOTOS_DIR, { recursive: true });
	}
}

async function getPayments() {
	try {
		await initPaymentsFile();
		const data = await fs.readFile(PAYMENTS_FILE, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Ошибка чтения payments.json:', error);
		return [];
	}
}

async function addPayment(userId, username, cart, total) {
	try {
		const payments = await getPayments();
		const newPayment = {
			id: payments.length + 1,
			userId,
			username: username || `ID ${userId}`,
			cart,
			total,
			status: 'pending',
			photo: null,
			timestamp: new Date().toISOString(),
			questionCount: cart.reduce(
				(count, item) =>
					item.id === 'single_question' ? count + item.quantity : count,
				0
			),
		};
		payments.push(newPayment);
		await fs.writeFile(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
		return newPayment;
	} catch (error) {
		console.error('Ошибка добавления платежа:', error);
		throw error;
	}
}

async function updatePaymentStatus(id, status, photo = null) {
	try {
		const payments = await getPayments();
		const payment = payments.find((p) => p.id === id);
		if (payment) {
			payment.status = status;
			if (photo) payment.photo = photo;
			await fs.writeFile(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
			return payment;
		}
		return null;
	} catch (error) {
		console.error('Ошибка обновления статуса платежа:', error);
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
		return photoPath;
	} catch (error) {
		console.error('Ошибка сохранения фото платежа:', error);
		throw error;
	}
}

module.exports = {
	addPayment,
	updatePaymentStatus,
	getPayments,
	savePaymentPhoto,
};
