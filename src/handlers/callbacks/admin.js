const {
	createAdminMenuKeyboard,
	createReviewModerationKeyboard,
	createPaymentConfirmationKeyboard,
	createQuestionActionKeyboard,
	createSupportQuestionActionKeyboard,
} = require('../../keyboards');
const { getPendingReviews } = require('../../services/reviews');
const { getPendingPayments } = require('../../services/payments');
const { getProcessingQuestions } = require('../../services/questions');
const { getProcessingSupportQuestions } = require('../../services/support');
const { sendOrEditMessage } = require('../utils');
const { InlineKeyboard } = require('grammy');
const logger = require('../../logger');

// Унифицированная функция для форматирования краткого описания элемента (для кнопок)
const formatItemShort = (item, type) => {
	const username = item.username || `ID ${item.userId}`;
	let text;
	switch (type) {
		case 'reviews':
			text = `Отзыв от @${username} ${item.text}`;
			break;
		case 'payments':
			text = `Платеж от @${username} ${item.total} руб.`;
			break;
		case 'questions':
			text = `Вопрос от @${username} ${item.text}`;
			break;
		case 'support_questions':
			text = `Вопрос техподдержки от @${username} ${item.text}`;
			break;
		default:
			text = '';
	}
	// Ограничиваем длину текста кнопки (Telegram: ~64 символа)
	return text.length > 60 ? text.substring(0, 57) + '...' : text;
};

// Унифицированная функция для форматирования полного описания элемента
const formatItemFull = (item, type) => {
	const username = item.username || `ID ${item.userId}`;
	switch (type) {
		case 'reviews':
			return `Отзыв от @${username}:\n${item.text}`;
		case 'payments':
			return `Платеж от @${username}\nСумма: ${item.total} руб.`;
		case 'questions':
			return `Вопрос от @${username}:\n${item.text}`;
		case 'support_questions':
			return `Вопрос техподдержки от @${username}:\n${item.text}`;
		default:
			return '';
	}
};

// Унифицированная функция для получения элемента по ID
const getItemById = async (type, id) => {
	const { ObjectId } = require('mongodb');
	const { connectDB } = require('../../db');
	const db = await connectDB();
	const collectionMap = {
		reviews: 'reviews',
		payments: 'payments',
		questions: 'questions',
		support_questions: 'support_questions',
	};
	const collection = collectionMap[type];
	if (!collection) return null;
	return await db.collection(collection).findOne({ _id: new ObjectId(id) });
};

// Проверка корректности photoFileId
const isValidPhotoFileId = (fileId) => {
	return (
		typeof fileId === 'string' &&
		fileId.length > 10 &&
		/^Ag[A-Za-z0-9_-]+$/.test(fileId)
	);
};

// Обработчик callback-запросов админ-панели
const handleAdminCallback = async (ctx, action) => {
	if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
		await sendOrEditMessage(
			ctx,
			'У вас нет доступа к админ-панели.',
			createAdminMenuKeyboard(),
			true
		);
		await ctx.answerCallbackQuery();
		return;
	}

	let items = [];
	let type = '';
	let keyboardCreator;
	let itemTypeLabel = '';
	let title = 'Список элементов';

	// Обработка выбора раздела или элемента
	if (action === 'admin_reviews') {
		items = await getPendingReviews();
		type = 'reviews';
		keyboardCreator = createReviewModerationKeyboard;
		itemTypeLabel = 'отзывов';
		title = 'Список отзывов';
	} else if (action === 'admin_payments') {
		items = await getPendingPayments();
		type = 'payments';
		keyboardCreator = createPaymentConfirmationKeyboard;
		itemTypeLabel = 'платежей';
		title = 'Список платежей';
	} else if (action === 'admin_questions') {
		items = await getProcessingQuestions();
		type = 'questions';
		keyboardCreator = createQuestionActionKeyboard;
		itemTypeLabel = 'вопросов';
		title = 'Список вопросов';
	} else if (action === 'admin_support_questions') {
		items = await getProcessingSupportQuestions();
		type = 'support_questions';
		keyboardCreator = createSupportQuestionActionKeyboard;
		itemTypeLabel = 'вопросов техподдержки';
		title = 'Список вопросов технической поддержки';
	} else if (action.startsWith('select_')) {
		// Обработка выбора конкретного элемента
		const [_, itemType, itemId] = action.split('_');
		const item = await getItemById(itemType, itemId);
		console.log(item);
		if (!item) {
			await sendOrEditMessage(
				ctx,
				'Элемент не найден.',
				createAdminMenuKeyboard(),
				true
			);
			await ctx.answerCallbackQuery();
			logger.info(
				`Admin ${ctx.from.id} attempted to select non-existent item: ${action}`
			);
			return;
		}

		let keyboard;
		try {
			if (itemType === 'reviews') {
				const message = formatItemFull(item, itemType);
				keyboard = createReviewModerationKeyboard(itemId);
				await sendOrEditMessage(ctx, message, keyboard, true);
			} else if (itemType === 'payments') {
				if (!item.photoFileId) {
					await sendOrEditMessage(
						ctx,
						`Фото платежа не найдено или имеет неверный формат.\n${formatItemFull(
							item,
							itemType
						)}`,
						createAdminMenuKeyboard(),
						true
					);
				} else {
					const caption = formatItemFull(item, itemType);
					keyboard = createPaymentConfirmationKeyboard(itemId);
					console.log(item.photoFileId);
					await ctx.api.sendPhoto(ctx.chat.id, item.photoFileId, {
						caption,
						reply_markup: keyboard,
					});
				}
			} else if (itemType === 'questions') {
				const message = formatItemFull(item, itemType);
				keyboard = createQuestionActionKeyboard(itemId);
				await sendOrEditMessage(ctx, message, keyboard, true);
			} else if (itemType === 'support_questions') {
				const message = formatItemFull(item, itemType);
				keyboard = createSupportQuestionActionKeyboard(itemId);
				await sendOrEditMessage(ctx, message, keyboard, true);
			}
		} catch (error) {
			logger.error(`Error processing ${itemType} with ID ${itemId}`, {
				error: error.message,
				stack: error.stack,
			});
			await sendOrEditMessage(
				ctx,
				`Произошла ошибка при обработке элемента.\n${formatItemFull(
					item,
					itemType
				)}`,
				keyboard || createAdminMenuKeyboard(),
				true
			);
		}

		await ctx.answerCallbackQuery();
		logger.info(`Admin ${ctx.from.id} selected ${itemType} with ID ${itemId}`);
		return;
	} else {
		await sendOrEditMessage(
			ctx,
			'Неизвестное действие.',
			createAdminMenuKeyboard(),
			true
		);
		await ctx.answerCallbackQuery();
		logger.info(`Admin ${ctx.from.id} attempted unknown action: ${action}`);
		return;
	}

	// Если нет элементов, отправляем сообщение об их отсутствии
	if (!items.length) {
		await sendOrEditMessage(
			ctx,
			`Нет ${itemTypeLabel} в обработке.`,
			createAdminMenuKeyboard(),
			true
		);
		await ctx.answerCallbackQuery();
		logger.info(`Admin ${ctx.from.id} accessed ${action}: no items found`);
		return;
	}

	// Формируем клавиатуру с кнопками, где текст кнопки совпадает с описанием элемента
	const keyboard = new InlineKeyboard();
	items.forEach((item) => {
		const itemText = formatItemShort(item, type);
		keyboard.text(itemText, `select_${type}_${item._id}`).row();
	});
	keyboard.text('Назад', 'back_to_admin_menu');

	// Отправляем сообщение с заголовком и клавиатурой
	await sendOrEditMessage(ctx, title, keyboard, true);
	await ctx.answerCallbackQuery();
	logger.info(
		`Admin ${ctx.from.id} accessed ${action} with ${items.length} items`
	);
};

module.exports = { handleAdminCallback };
