const {
	createStartKeyboard,
	createPriceKeyboard,
	createCartKeyboard,
	createBackKeyboard,
} = require('./keyboards');
const { MESSAGES, SERVICES } = require('./constants');

// Утилита для редактирования сообщения
const editMessage = async (ctx, text, keyboard) => {
	try {
		await ctx.editMessageText(text, {
			parse_mode: 'Markdown',
			reply_markup: keyboard,
		});
		await ctx.answerCallbackQuery();
	} catch (error) {
		if (error.description.includes('message is not modified')) {
			await ctx.answerCallbackQuery();
		} else {
			console.error('Ошибка при редактировании сообщения:', error);
			await ctx.reply('Ой, что-то пошло не так! 😔 Попробуйте снова.', {
				parse_mode: 'Markdown',
				reply_markup: createStartKeyboard(),
			});
			await ctx.answerCallbackQuery({ text: 'Ошибка, попробуйте снова' });
		}
	}
};

// Утилита для получения состояния корзины
const getCartSummary = (cart) => ({
	count: cart.length,
	total: cart.reduce((sum, item) => sum + item.price, 0),
});

// Обработчик команды /start
const handleStart = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	ctx.session.lastAction = null;
	ctx.session.actionCount = 0;
	await ctx.reply(MESSAGES.start.replace('%s', userName), {
		parse_mode: 'Markdown',
		reply_markup: createStartKeyboard(),
	});
};

// Обработчики callback'ов
const callbackHandlers = {
	back_to_menu: async (ctx, userName) => {
		await editMessage(
			ctx,
			MESSAGES.start.replace('%s', userName),
			createStartKeyboard()
		);
	},

	show_terms: async (ctx) => {
		await editMessage(ctx, MESSAGES.terms, createBackKeyboard());
	},

	show_price: async (ctx) => {
		const { count, total } = getCartSummary(ctx.session.cart);
		const updatedPriceText = `${MESSAGES.price}\n\n🛒 В корзине: ${count} услуг на сумму ${total} руб.`;
		await editMessage(ctx, updatedPriceText, createPriceKeyboard());
	},

	show_reviews: async (ctx) => {
		await editMessage(ctx, MESSAGES.reviews, createBackKeyboard());
	},

	view_cart: async (ctx) => {
		let text;
		if (ctx.session.cart.length === 0) {
			text = MESSAGES.cartEmpty;
		} else {
			const items = ctx.session.cart
				.map((item, index) => `${index + 1}. ${item.name} — ${item.price} руб.`)
				.join('\n');
			const { total } = getCartSummary(ctx.session.cart);
			text = MESSAGES.cartContent
				.replace('%items', items)
				.replace('%total', total);
		}
		await editMessage(ctx, text, createCartKeyboard());
	},

	clear_cart: async (ctx) => {
		ctx.session.cart = [];
		await ctx.answerCallbackQuery('Корзина очищена');
		await editMessage(ctx, MESSAGES.cartEmpty, createCartKeyboard());
	},

	pay_cart: async (ctx) => {
		if (ctx.session.cart.length === 0) {
			await ctx.answerCallbackQuery('Корзина пуста');
			return;
		}
		ctx.session.paidServices = ctx.session.cart;
		ctx.session.hasPaid = true;
		ctx.session.questionCount = 0;
		ctx.session.lastAction = null;
		ctx.session.actionCount = 0;
		const { total } = getCartSummary(ctx.session.cart);

		// Проверяем, есть ли услуга "Ответ на 1 вопрос"
		const hasSingleQuestion = ctx.session.cart.some(
			(s) => s.id === 'single_question'
		);
		ctx.session.cart = [];

		if (hasSingleQuestion) {
			ctx.session.awaitingQuestion = true;
			await editMessage(
				ctx,
				`${MESSAGES.paymentConfirmed}\nОплачено: ${total} руб.\n\n${MESSAGES.askQuestion}`,
				createBackKeyboard()
			);
		} else {
			await editMessage(
				ctx,
				`${MESSAGES.paymentConfirmed}\nОплачено: ${total} руб.\n\nЭта услуга пока не поддерживает задавание вопросов.`,
				createStartKeyboard()
			);
		}
		await ctx.answerCallbackQuery('Оплата подтверждена');
	},
};

// Обработчик всех callback'ов
const handleCallbackQuery = async (ctx) => {
	const userName = ctx.from?.first_name || 'Друг';
	ctx.session.awaitingQuestion = false;
	const action = ctx.callbackQuery.data;
	console.log(`Callback action: ${action}`);

	// Отслеживание повторных нажатий
	if (ctx.session.lastAction === action) {
		ctx.session.actionCount = (ctx.session.actionCount || 0) + 1;
	} else {
		ctx.session.lastAction = action;
		ctx.session.actionCount = 1;
	}
	console.log(`Action count: ${ctx.session.actionCount}`);

	// Если нажато более 3 раз, отправляем гифку
	if (ctx.session.actionCount > 3) {
		await ctx.replyWithAnimation(
			'ВСТАВЬТЕ_СЮДА_FILE_ID', // Замените на file_id гифки с гоблином
			{ caption: 'Эй, хватит тыкать одну и ту же кнопку! 😺' }
		);
		await ctx.answerCallbackQuery();
		return;
	}

	// Обработка add_to_cart_ отдельно из-за динамического ID
	if (action.startsWith('add_to_cart_')) {
		const serviceId = action.replace('add_to_cart_', '');
		console.log(`Extracted serviceId: ${serviceId}`);
		console.log(`Available services: ${JSON.stringify(SERVICES)}`);
		const service = SERVICES.find((s) => s.id === serviceId);
		if (service) {
			ctx.session.cart.push({
				name: service.name,
				price: service.price,
				id: service.id,
			});
			const { count, total } = getCartSummary(ctx.session.cart);
			const updatedPriceText = `${MESSAGES.price}\n\n🛒 В корзине: ${count} услуг на сумму ${total} руб.`;
			await ctx.answerCallbackQuery(`Добавлено: ${service.name}`);
			await editMessage(ctx, updatedPriceText, createPriceKeyboard());
		} else {
			await ctx.answerCallbackQuery(
				`Ошибка: услуга с ID ${serviceId} не найдена`
			);
		}
		return;
	}

	// Вызов обработчика для остальных действий
	const handler = callbackHandlers[action];
	if (handler) {
		await handler(ctx, userName);
	} else {
		await ctx.answerCallbackQuery(`Неизвестное действие: ${action}`);
	}
};

// Обработчик текстовых сообщений
const handleText = async (ctx) => {
	// Логирование всех медиа для диагностики
	if (ctx.message) {
		console.log('Received message:', {
			animation: !!ctx.message.animation,
			video: !!ctx.message.video,
			sticker: !!ctx.message.sticker,
			photo: !!ctx.message.photo,
			text: ctx.message.text,
		});
	}

	// Логирование file_id гифки
	if (ctx.message.animation) {
		console.log(`GIF file_id: ${ctx.message.animation.file_id}`);
		await ctx.reply(`GIF file_id: ${ctx.message.animation.file_id}`);
	} else if (ctx.message.video) {
		console.log(`Video file_id: ${ctx.message.video.file_id}`);
		await ctx.reply(`Video file_id: ${ctx.message.video.file_id}`);
	} else if (ctx.message.sticker) {
		console.log(`Sticker file_id: ${ctx.message.sticker.file_id}`);
		await ctx.reply(`Sticker file_id: ${ctx.message.sticker.file_id}`);
	}

	if (ctx.session.awaitingQuestion) {
		const hasQuestionService = ctx.session.paidServices?.some(
			(s) => s.id === 'single_question' && (ctx.session.questionCount || 0) < 1
		);
		if (!hasQuestionService) {
			await ctx.reply(
				'У вас нет оплаченной услуги "Ответ на 1 вопрос" или лимит вопросов исчерпан.',
				{ parse_mode: 'Markdown', reply_markup: createBackKeyboard() }
			);
			ctx.session.awaitingQuestion = false;
			return;
		}

		const question = ctx.message.text;
		const userInfo = ctx.from.username
			? `@${ctx.from.username}`
			: `ID ${ctx.from.id}`;
		const userName = ctx.from?.first_name || 'Пользователь';

		await ctx.api.sendMessage(
			process.env.ADMIN_ID,
			`Новый вопрос от ${userInfo} (${userName}):\n${question}`
		);

		ctx.session.questionCount = (ctx.session.questionCount || 0) + 1;
		ctx.session.lastAction = null;
		ctx.session.actionCount = 0;
		await ctx.reply('Ваш вопрос отправлен! Ожидайте ответа. 😊', {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});

		ctx.session.awaitingQuestion = false;
	} else {
		await ctx.reply(MESSAGES.unknownMessage, {
			parse_mode: 'Markdown',
			reply_markup: createStartKeyboard(),
		});
	}
};

module.exports = { handleStart, handleCallbackQuery, handleText };
