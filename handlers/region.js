// ==================================================
// Обработчик выбора области из меню.
// При получении названия области (совпадающего с одной из кнопок)
// запрашивает её описание из Wikipedia и отправляет пользователю.
// После этого снова показывает меню областей.
// ==================================================

const REGIONS = require('../constants/regions');
const TEXTS = require('../constants/texts');
const { getDescription } = require('../services/wikipedia');
const { getRegionsKeyboard } = require('../utils/keyboards');

// Обрабатывает нажатие на кнопку области.
// Принимает сообщение, бота, Map языков и Map состояний.
// Возвращает true, если сообщение было обработано как выбор области.
async function handleRegionSelection(msg, bot, userLanguages, userStates) {
    const chatId = msg.chat.id;
    const text = msg.text;
    const lang = userLanguages.get(chatId);

    // Ищем область по названию кнопки (сопоставляем с данными REGIONS)
    const regionEntry = Object.entries(REGIONS).find(([_, v]) => v[lang] === text);
    if (!regionEntry) return false; // не область

    const [key, reg] = regionEntry;
    const waitMsg = await bot.sendMessage(chatId, TEXTS[lang].loadingRegion); // Сообщение "загружаю..."
    try {
        // Получаем описание области из Wikipedia
        const desc = await getDescription(reg.apiName, lang);
        await bot.editMessageText(TEXTS[lang].regionInfo(reg[lang], reg.code, desc), {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
        });
    } catch {
        // Если Wikipedia недоступна, показываем сообщение об ошибке
        await bot.editMessageText(TEXTS[lang].apiError, {
            chat_id: chatId,
            message_id: waitMsg.message_id
        });
    }
    // После показа информации об области снова показываем меню областей
    const keyboard = getRegionsKeyboard(chatId, lang, bot, userStates);
    await bot.sendMessage(chatId, TEXTS[lang].selectRegion, keyboard);
    return true;
}

module.exports = handleRegionSelection;