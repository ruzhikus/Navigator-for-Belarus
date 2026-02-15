// ==================================================
// Сервис для получения информации из Wikipedia.
// Функции:
// - getOfficialYear: извлекает год основания города из русскоязычной статьи.
// - getDescription: получает краткое описание (первые 3 предложения)
//   сначала на белорусском (если выбран белорусский язык), затем на русском.
// ==================================================

const axios = require('axios');
const TEXTS = require('../constants/texts');

// Извлекает год основания города из русскоязычной Wikipedia.
// Использует API action=query с prop=revisions для получения сырого вики-текста.
// Принимает название города и язык пользователя, возвращает год или строку "не указан".
async function getOfficialYear(city, lang) {
    try {
        // Запрос к Wikipedia API для получения содержимого статьи
        const url = `https://ru.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(city)}&rvsection=0&redirects=1`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'TravelBot/1.0' } });
        // Извлекаем содержимое первой страницы (объект pages может содержать несколько, но мы берём первый)
        const content = Object.values(data.query.pages)[0].revisions[0]['*'];
        // Ищем в тексте год основания с помощью регулярного выражения (ключевые слова и цифры)
        const match = content.match(/(?:основан|дата основания|первое упоминание)\s*=\s*(?:\[\[)?(\d{3,4})/i);
        return match ? match[1] : TEXTS[lang].yearNotSpecified;
    } catch {
        // Если произошла ошибка (сеть, нет страницы и т.д.), возвращаем "не указан"
        return TEXTS[lang].yearNotSpecified;
    }
}

// Получает краткое описание объекта из Wikipedia.
// Пытается сначала загрузить на языке пользователя (be для bel, ru для rus),
// при неудаче использует русский как запасной.
// Принимает название объекта и язык пользователя, возвращает описание (первые 3 предложения).
// В случае полной недоступности выбрасывает ошибку.
async function getDescription(name, lang) {
    const tryLang = lang === 'bel' ? 'be' : 'ru'; // Код языка для Wikipedia API
    const fallbackLang = 'ru'; // Резервный язык
    // Пробуем запросить описание на нужном языке, если не вышло — на русском
    for (const code of [tryLang, fallbackLang]) {
        try {
            const url = `https://${code}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
            const { data } = await axios.get(url, {
                headers: { 'User-Agent': 'BelarusTravelBot/1.0' },
                timeout: 10000
            });
            if (data.extract) {
                // Берём первые три предложения, чтобы ответ был кратким
                const sentences = data.extract.split('. ').slice(0, 3).join('. ') + '.';
                // Очистка от квадратных скобок (ссылок) и лишних пробелов
                return sentences.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
            }
        } catch {
            // Пробуем следующий язык (если не удалось, просто игнорируем)
        }
    }
    // Если ни один язык не дал результата, выбрасываем ошибку, которая будет поймана выше
    throw new Error('API недоступно');
}

module.exports = { getOfficialYear, getDescription };