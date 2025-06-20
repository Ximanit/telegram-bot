const { Bot, session } = require('grammy');

require('dotenv').config();

const { handleStart, handleMeow, handleHelp } = require('./handlers/commands');
const { handleCallbackQuery } = require('./handlers/callbacks');
const { handleText } = require('./handlers/text');
const { handleError } = require('./handlers/utils');

// Проверка переменных окружения
if (!process.env.API_KEY || !process.env.ADMIN_ID) {
	console.error('Ошибка: API_KEY или ADMIN_ID не указаны в .env');
	process.exit(1);
}

const bot = new Bot(process.env.API_KEY);

// Инициализация сессии
bot.use(
	session({
		initial: () => ({
			hasPaid: false,
			awaitingQuestion: false,
			awaitingReview: false,
			cart: [], // Пустая корзина для хранения услуг с количеством
			paidServices: [],
			questionCount: 0,
			lastAction: null,
		}),
	})
);

// Регистрация обработчиков
bot.command('start', handleStart);
bot.command('meow', handleMeow);
bot.command('help', handleHelp);
bot.on('callback_query:data', handleCallbackQuery);
bot.on('message:text', handleText);

// Обработка ошибок
bot.catch((err, ctx) => {
	const updateId = ctx?.update?.update_id ?? 'unknown';
	console.error(`Error for update ${updateId}:`, {
		error: err,
		context: ctx ? JSON.stringify(ctx, null, 2) : 'No context available',
	});
	if (ctx?.chat) {
		handleError(ctx);
	}
});

bot.start();
