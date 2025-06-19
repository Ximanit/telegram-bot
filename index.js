const { Bot, session } = require('grammy');
require('dotenv').config();
const { handleStart, handleCallbackQuery, handleText } = require('./handlers');

const bot = new Bot(process.env.API_KEY);

// Инициализация сессии
bot.use(
	session({
		initial: () => ({
			hasPaid: false,
			awaitingQuestion: false,
			cart: [],
			paidServices: [],
			questionCount: 0,
			lastAction: null, // Последнее действие
			actionCount: 0, // Счётчик повторных нажатий
		}),
	})
);

// Регистрация обработчиков
bot.command('start', handleStart);
bot.command('pay', async (ctx) => {
	ctx.session.hasPaid = true;
	ctx.session.awaitingQuestion = false;
	ctx.session.paidServices = [];
	ctx.session.questionCount = 0;
	ctx.session.lastAction = null; // Сбрасываем при оплате
	ctx.session.actionCount = 0;
	await ctx.reply(
		'Оплата подтверждена! Для вопросов добавьте услугу "Ответ на 1 вопрос" в корзину.',
		{
			parse_mode: 'Markdown',
		}
	);
});
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
		ctx.reply('Ой, что-то пошло не так! 😔 Попробуйте позже.');
	}
});

bot.start();
