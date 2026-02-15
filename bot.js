// ==================================================
// Главный файл бота.
// Инициализирует TelegramBot, загружает конфигурацию,
// использует модуль состояния для хранения языков и состояний пользователей.
// ==================================================

const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_BOT_TOKEN } = require('./config/token'); // Токен бота из конфига
const TEXTS = require('./constants/texts');
const handleLanguageSelection = require('./handlers/language');
const handleRegionSelection = require('./handlers/region');
const handleCitySearch = require('./handlers/city');
const { getLanguageKeyboard } = require('./utils/keyboards');
// Импортируем хранилища состояний из отдельного модуля
const { userLanguages, userStates } = require('./utils/state');

// Инициализация бота с long-polling (постоянный опрос сервера Telegram)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: {
        interval: 100,      // Проверяем новые сообщения каждые 100 мс
        autoStart: true,    // Автоматически запускаем polling
        params: { timeout: 5 } // Ждём ответ от Telegram 5 секунд
    }
});

// Основной обработчик всех входящих сообщений
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Команда /start – сбрасываем всё и показываем выбор языка
    if (text === '/start') {
        userLanguages.delete(chatId); // Удаляем запись о языке
        userStates.delete(chatId);    // Удаляем запись о состоянии
        return bot.sendMessage(chatId, '🌐 *Выберите язык / Абярыце мову:*', {
            parse_mode: 'Markdown',
            ...getLanguageKeyboard()
        });
    }

    // Если у пользователя ещё не выбран язык – направляем в обработчик языка
    if (!userLanguages.has(chatId)) {
        return handleLanguageSelection(msg, bot, userLanguages, userStates);
    }

    const lang = userLanguages.get(chatId); // текущий язык пользователя

    // Кнопка смены языка – сбрасываем язык и состояние, показываем выбор языка
    if (text === TEXTS[lang].changeLang) {
        userLanguages.delete(chatId);
        userStates.delete(chatId);
        return bot.sendMessage(chatId, '🌐 *Выберите язык / Абярыце мову:*', {
            parse_mode: 'Markdown',
            ...getLanguageKeyboard()
        });
    }

    // Если пользователь находится в состоянии выбора области – пробуем обработать как область
    if (userStates.get(chatId) === 'awaiting_region') {
        const handled = await handleRegionSelection(msg, bot, userLanguages, userStates);
        if (handled) return; // если это была область, дальнейшая обработка не требуется
    }

    // Всё остальное (текст длиннее 1 символа) считаем запросом города
    if (text?.length > 1) {
        await handleCitySearch(chatId, text, lang, bot);
    }
    // Сообщения из одного символа игнорируем (например, случайные нажатия)
});

// Вывод в консоль при успешном запуске
console.log('🚀 Навигатор по Беларуси запущен!');
console.log('👥 Разработчики: Соловьёв Никита (@ruzhikus) и Кураш Константин (@confuseduser11111)');