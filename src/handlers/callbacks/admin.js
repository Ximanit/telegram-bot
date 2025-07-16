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
const { getItemById } = require('../../db');

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

// Обработчик callback-запросов админ-панели
const handleAdminCallback = async (ctx, action) => {
	if (ctx.from.id.toString() !== process.env.ADMIN_ID) {
		await sendOrEditMessage(
			ctx,
			'У вас нет доступа к админ-панели.',
			createAdminMenuKeyboard()
		);
		await ctx.answerCallbackQuery();
		return;
	}

	let items = [];
	let type = '';
	let keyboardCreator;
	let itemTypeLabel = '';
	let title = 'Список элементов';

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
		const [_, itemType, itemId] = action.split('_');
		const item = await getItemById(itemType, itemId);
		if (!item) {
			await sendOrEditMessage(
				ctx,
				'Элемент не найден.',
				createAdminMenuKeyboard()
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
				await sendOrEditMessage(ctx, message, keyboard);
			} else if (action.startsWith('select_')) {
				const [_, itemType, itemId] = action.split('_');
				const item = await getItemById(itemType, itemId);
				if (!item) {
					await sendOrEditMessage(
						ctx,
						'Элемент не найден.',
						createAdminMenuKeyboard()
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
						await sendOrEditMessage(ctx, message, keyboard);
					} else if (itemType === 'payments') {
						const caption = formatItemFull(item, itemType);
						keyboard = createPaymentConfirmationKeyboard(itemId);
						logger.info(`Attempting to send payment photo`, {
							paymentId: itemId,
							telegramFileId: item.telegramFileId,
						});

						if (item.telegramFileId) {
							try {
								await ctx.api.sendPhoto(ctx.chat.id, item.telegramFileId, {
									caption,
									reply_markup: keyboard,
								});
								logger.info(`Sent payment photo using telegramFileId`, {
									paymentId: itemId,
									telegramFileId: item.telegramFileId,
								});
							} catch (photoError) {
								logger.warn(`Failed to send photo with telegramFileId`, {
									paymentId: itemId,
									error: photoError.message,
								});
								await sendOrEditMessage(
									ctx,
									`Не удалось загрузить фото платежа.\n${caption}`,
									keyboard
								);
							}
						} else {
							await sendOrEditMessage(
								ctx,
								`Фото платежа не найдено.\n${caption}`,
								keyboard
							);
						}
					} else if (itemType === 'questions') {
						const message = formatItemFull(item, itemType);
						keyboard = createQuestionActionKeyboard(itemId);
						await sendOrEditMessage(ctx, message, keyboard);
					} else if (itemType === 'support_questions') {
						const message = formatItemFull(item, itemType);
						keyboard = createSupportQuestionActionKeyboard(itemId);
						await sendOrEditMessage(ctx, message, keyboard);
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
						keyboard || createAdminMenuKeyboard()
					);
				}

				await ctx.answerCallbackQuery();
				logger.info(
					`Admin ${ctx.from.id} selected ${itemType} with ID ${itemId}`
				);
				return;
			} else if (itemType === 'questions') {
				const message = formatItemFull(item, itemType);
				keyboard = createQuestionActionKeyboard(itemId);
				await sendOrEditMessage(ctx, message, keyboard);
			} else if (itemType === 'support_questions') {
				const message = formatItemFull(item, itemType);
				keyboard = createSupportQuestionActionKeyboard(itemId);
				await sendOrEditMessage(ctx, message, keyboard);
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
				keyboard || createAdminMenuKeyboard()
			);
		}

		await ctx.answerCallbackQuery();
		logger.info(`Admin ${ctx.from.id} selected ${itemType} with ID ${itemId}`);
		return;
	} else {
		await sendOrEditMessage(
			ctx,
			'Неизвестное действие.',
			createAdminMenuKeyboard()
		);
		await ctx.answerCallbackQuery();
		logger.info(`Admin ${ctx.from.id} attempted unknown action: ${action}`);
		return;
	}

	if (!items.length) {
		await sendOrEditMessage(
			ctx,
			`Нет ${itemTypeLabel} в обработке.`,
			createAdminMenuKeyboard()
		);
		await ctx.answerCallbackQuery();
		logger.info(`Admin ${ctx.from.id} accessed ${action}: no items found`);
		return;
	}

	const keyboard = new InlineKeyboard();
	items.forEach((item) => {
		const itemText = formatItemShort(item, type);
		keyboard.text(itemText, `select_${type}_${item._id}`).row();
	});
	keyboard.text('Назад', 'back_to_admin_menu');

	await sendOrEditMessage(ctx, title, keyboard);
	await ctx.answerCallbackQuery();
	logger.info(
		`Admin ${ctx.from.id} accessed ${action} with ${items.length} items`
	);
};

module.exports = { handleAdminCallback };
