// БЛОК 1: ИНИЦИАЛИЗАЦИЯ И КОНФИГУРАЦИЯ

// Импорт необходимых библиотек
const TelegramBot = require('node-telegram-bot-api'); // Основная библиотека для работы с Telegram API
const axios = require('axios'); // Библиотека для HTTP-запросов к внешним API
require('dotenv').config(); // Загрузка ключей из файла .env

// Инициализация Telegram бота с использованием токена из .env
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: { // Использование long-polling метода для получения обновлений ("а есть ли что-то новое?")
        interval: 100, // Проверяем новые сообщения каждые 100 мс
        autoStart: true, // Автоматически запускаем бота
        params: {
            timeout: 5 // Ждем ответ от Telegram 5 секунд
        }
    }
});

// Получение API ключей из .env
const WEATHER_KEY = process.env.OPENWEATHER_API_KEY; // Ключ для OpenWeather API

// БЛОК 2: ХРАНЕНИЕ ДАННЫХ И КОНСТАНТЫ

const userLanguages = new Map(); // Хранит язык для каждого user (rus/bel)
const userStates = new Map(); // Хранит текущее состояние user 

// Области Беларуси на двух языках (rus/bel)
const belarusRegions = {
    'rus': { // RUS
        'brest': 'Брестская область',
        'vitebsk': 'Витебская область', 
        'gomel': 'Гомельская область',
        'grodno': 'Гродненская область',
        'minsk': 'Минская область',
        'mogilev': 'Могилёвская область'
    },
    'bel': { // BEL
        'brest': 'Брэсцкая вобласць',
        'vitebsk': 'Віцебская вобласць',
        'gomel': 'Гомельская вобласць',
        'grodno': 'Гродзенская вобласць',
        'minsk': 'Мінская вобласць',
        'mogilev': 'Магілёўская вобласць'
    }
};

// Коды автомобильных номеров для каждой области
const regionLicenseCodes = {
    'brest': '1',
    'vitebsk': '2',
    'gomel': '3',
    'grodno': '4',
    'minsk': '5, 7', 
    'mogilev': '6'
};

// Названия областей на русском для использования в API Wikipedia
const regionNamesForAPI = {
    'brest': 'Брестская область',
    'vitebsk': 'Витебская область',
    'gomel': 'Гомельская область',
    'grodno': 'Гродненская область',
    'minsk': 'Минская область',
    'mogilev': 'Могилёвская область'
};

// Тексты бота на двух языках
const texts = {
    'rus': { 
        welcome: `🗺️ *Добро пожаловать в "Навигатор по Беларуси"!*

📚 *О проекте:*
Этот Telegram-бот был создан учащимися *Витебского государственного технического колледжа* из группы *ВР-21:*
• [Соловьёв Никита](https://t.me/ruzhikus)
• [Кураш Константин](https://t.me/confuseduser11111)

📍 *Возможности бота:*
• Поиск информации о населённых пунктах Беларуси
• Погода, достопримечательности, история
• Автомобильные коды регионов
• Информация по областям

📝 *Как пользоваться:*
Просто напишите название города или населённого пункта Беларуси, и бот найдёт всю информацию!

_Бот работает со всеми населёнными пунктами из 6 областей Беларуси:_
• Брестская область
• Витебская область  
• Гомельская область
• Гродненская область
• Минская область
• Могилёвская область

Выберите язык для продолжения:`,
        changeLang: '🌐 Сменить язык',
        regions: '📍 Области Беларуси',
        cityNotFound: '❌ Город не найден в базе Беларуси. Пожалуйста, проверьте написание или выберите город из Беларуси.',
        error: '⚠️ Произошла ошибка при загрузке данных.',
        searching: '🔍 Ищу информацию о городе...',
        loadingRegion: '📖 Загружаю информацию об области...',
        selectRegion: 'Выберите область:',
        back: '⬅️ Назад',
        yearNotSpecified: 'не указан',
        regionInfo: (regionName, code, description) => 
            `*${regionName}*\n\n🚗 Код автомобильных номеров: *${code}*\n\n📝 *Описание:*\n${description}\n\n_Для поиска конкретного города просто напишите его название в чат_`,
        apiError: '⚠️ Не удалось загрузить информацию об области. Пожалуйста, попробуйте позже.'
    },
    'bel': { 
        welcome: `🗺️ *Сардэчна запрашаем у "Навігатар па Беларусі"!*

📚 *Пра праект:*
Гэты Telegram-бот быў створаны навучэнцамі *Віцебскага дзяржаўнага тэхнічнага каледжа* з групы *ВР-21:*
• [Салаўёў Нікіта](https://t.me/ruzhikus)
• [Кураш Канстанцін](https://t.me/confuseduser11111)

📍 *Магчымасці боўта:*
• Пошук інфармацыі пра населеныя пункты Беларусі
• Надвор'е, славутасці, гісторыя
• Аўтамабільныя коды рэгіёнаў
• Інфармацыя па вобласцях

📝 *Як карыстацца:*
Проста напішыце назву горада ці населенага пункта Беларусі, і бот знойдзе ўсю інфармацыю!

_Бот працуе з усімі населенымі пунктамі з 6 вобласцей Беларусі:_
• Брэсцкая вобласць
• Віцебская вобласць
• Гомельская вобласць
• Гродзенская вобласць
• Мінская вобласць
• Магілёўская вобласць

Абярыце мову для працягу:`,
        changeLang: '🌐 Змяніць мову',
        regions: '📍 Вобласці Беларуси',
        cityNotFound: '❌ Город не знойдзены ў базе Беларуси. Калі ласка, праверце напісанне ці абярыце горад з Беларусі.',
        error: '⚠️ Здарылася памылка пры загрузцы дадзеных.',
        searching: '🔍 Шукаю інфармацыю пра горад...',
        loadingRegion: '📖 Загружаю інфармацыю пра вобласць...',
        selectRegion: 'Абярыце вобласць:',
        back: '⬅️ Назад',
        yearNotSpecified: 'не пазначаны',
        regionInfo: (regionName, code, description) => 
            `*${regionName}*\n\n🚗 Код аўтамабільных нумароў: *${code}*\n\n📝 *Апісанне:*\n${description}\n\n_Для пошуку канкрэтнага горада проста напішыце яго назву ў чат_`,
        apiError: '⚠️ Не атрымалася загрузіць інфармацыю пра вобласць. Калі ласка, паспрабуйце пазней.'
    }
};

//  БЛОК 3: ВНЕШНИЕ API ИНТЕГРАЦИИ

// Проверка находится ли город в Беларуси
async function isCityInBelarus(cityName) {
    try {
        // Запрос к геокодирующему API OpenWeather для определения страны города
        const geoRes = await axios.get(
            `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${WEATHER_KEY}`
        );
        
        // Если сайт ответил и страна - Беларусь (BY)
        if (geoRes.data.length > 0) {
            const country = geoRes.data[0].country;
            return country === 'BY';
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

// Получение года основания города из Wikipedia
async function getOfficialYear(cityName, lang) {
    try {
        // Запрос к Wikipedia API для получения содержимого статьи
        const url = `https://ru.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(cityName)}&rvsection=0&redirects=1`;
        const res = await axios.get(url, { headers: { 'User-Agent': 'TravelBot/1.0' } });
        
        // Ищем в тексте год основания
        const pages = res.data.query.pages;
        const content = Object.values(pages)[0].revisions[0]['*'];
        const yearMatch = content.match(/(?:основан|дата основания|первое упоминание)\s*=\s*(?:\[\[)?(\d{3,4})/i);
        return yearMatch ? yearMatch[1] : texts[lang].yearNotSpecified;
    } catch (e) { 
        return texts[lang].yearNotSpecified; 
    }
}

// Получение описания города из Wikipedia
async function getDescription(name, lang) {
    try {
        // Выбираем язык для Wikipedia API
        const langCode = lang === 'bel' ? 'be' : 'ru';
        const url = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
        
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'BelarusTravelBot/1.0' },
            timeout: 10000
        });
        
        if (response.data.extract) {
            // Берем первые 3 предложения из описания
            const sentences = response.data.extract.split('. ');
            const description = sentences.slice(0, 3).join('. ') + '.';
            
            // Очистка от квадратных скобок (ссылок в вики-разметке) и лишних пробелов
            return description.replace(/\[.*?\]/g, '')
                             .replace(/\s+/g, ' ')
                             .trim();
        }
        throw new Error('No extract found');
    } catch (error) {
        // Если не удалось получить описание на белорусском, пробуем на русском
        if (lang === 'bel') {
            try {
                const url = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
                const response = await axios.get(url, {
                    headers: { 'User-Agent': 'BelarusTravelBot/1.0' },
                    timeout: 10000
                });
                
                if (response.data.extract) {
                    const sentences = response.data.extract.split('. ');
                    const description = sentences.slice(0, 3).join('. ') + '.';
                    return description.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
                }
            } catch (e) {
                throw new Error('API недоступно');
            }
        }
        throw new Error('API недоступно');
    }
}

// Получение достопримечательностей из OpenStreetMap
async function getAttractionsFromOSM(cityName, lat, lon, lang) {
    try {
        // Запрос для поиска достопримечательностей в радиусе 5км
        const query = `
            [out:json];
            (
                node["tourism"~"museum|attraction"](around:5000,${lat},${lon});
                node["historic"](around:5000,${lat},${lon});
                node["amenity"="place_of_worship"](around:5000,${lat},${lon});
                node["leisure"="park"](around:5000,${lat},${lon});
            );
            out body;
        `;
        
        const url = 'https://overpass-api.de/api/interpreter';
        const response = await axios.post(url, `data=${encodeURIComponent(query)}`, {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'BelarusTravelBot/1.0'
            },
            timeout: 15000
        });
        
        // Обрабатываем найденные места
        if (response.data.elements && response.data.elements.length > 0) {
            const attractions = response.data.elements
                .filter(element => element.tags && element.tags.name) // Фильтр объектов с названиями
                .slice(0, 4) // Берем не более 4 достопримечательностей
                .map(element => {
                    const name = element.tags.name;
                    const type = getAttractionType(element.tags, lang); // Определяем тип на нужном языке
                    return `${type} "${name}"`;
                });
            
            if (attractions.length > 0) {
                return attractions.join('\n');
            }
        }
        
        // Если достопримечательностей не найдено, возвращаем стандартный список
        return getDefaultAttractions(cityName, lang);
    } catch (error) {
        return getDefaultAttractions(cityName, lang);
    }
}

// Функция для определения типа достопримечательности
function getAttractionType(tags, lang) {
    if (tags.tourism === 'museum') return lang === 'bel' ? '🏛️ Музей' : '🏛️ Музей';
    if (tags.tourism === 'attraction') return lang === 'bel' ? '📍 Славутасць' : '📍 Достопримечательность';
    if (tags.historic === 'castle') return lang === 'bel' ? '🏰 Замак' : '🏰 Замок';
    if (tags.historic === 'monument') return lang === 'bel' ? '🗿 Помнік' : '🗿 Памятник';
    if (tags.amenity === 'place_of_worship') return lang === 'bel' ? '⛪ Храм' : '⛪ Храм';
    if (tags.leisure === 'park') return lang === 'bel' ? '🌳 Парк' : '🌳 Парк';
    return lang === 'bel' ? '📍 Славутасць' : '📍 Достопримечательность';
}

// Функция возвращает стандартный список достопримечательностей
function getDefaultAttractions(cityName, lang) {
    if (lang === 'bel') {
        return `📍 Цэнтральная плошча\n🏛️ Мясцовы музей\n🌳 Гарадскі парк`;
    } else {
        return `📍 Центральная площадь\n🏛️ Местный музей\n🌳 Городской парк`;
    }
}

// БЛОК 4: ПРИВЕТСТВИЕ И МЕНЮ

// Показ выбора языка
async function showLanguageSelection(chatId) {
    const options = {
        reply_markup: {
            keyboard: [ 
                [{ text: '🇷🇺 Русский' }],
                [{ text: '🇧🇾 Белорусский' }]
            ],
            resize_keyboard: true // Автоматическое изменение размера клавиатуры
        }
    };
    
    await bot.sendMessage(chatId, '🌐 *Выберите язык / Абярыце мову:*', { 
        parse_mode: 'Markdown',
        ...options 
    });
}

// Приветственное сообщение
async function showWelcomeMessage(chatId, lang) {
    const welcomeText = texts[lang].welcome;
    
    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true // Отключаем предпросмотр ссылок
    });
    
    await showRegionsMenu(chatId, lang);
}

// Меню областей
async function showRegionsMenu(chatId, lang) {
    userStates.set(chatId, 'awaiting_region'); // Устанавливаем состояние ожидания выбора области
    
    const regions = Object.values(belarusRegions[lang]);
    const keyboard = [];
    
    // Располагаем кнопки по 2 в ряд
    for (let i = 0; i < regions.length; i += 2) {
        const row = [];
        row.push({ text: regions[i] });
        if (regions[i + 1]) {
            row.push({ text: regions[i + 1] });
        }
        keyboard.push(row);
    }
    
    // Добавление кнопки смены языка
    keyboard.push([{ text: texts[lang].changeLang }]);
    
    await bot.sendMessage(chatId, texts[lang].selectRegion, {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true
        }
    });
}

//  БЛОК 5: ПОИСК ГОРОДА И ОБРАБОТКА ДАННЫХ

// Основная функция поиска и отображения информации о городе
async function handleCitySearch(chatId, cityInput, lang) {
    try {
        // Отправка сообщения "идет поиск"
        const waitMsg = await bot.sendMessage(chatId, texts[lang].searching);
        
        // Проверка, что город находится в Беларуси
        const isInBelarus = await isCityInBelarus(cityInput);
        
        if (!isInBelarus) {
            await bot.editMessageText(texts[lang].cityNotFound, {
                chat_id: chatId,
                message_id: waitMsg.message_id
            });
            return;
        }
        
        //  Получение координат города
        const geoRes = await axios.get(
            `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityInput)}&limit=1&appid=${WEATHER_KEY}`
        );
        
        if (geoRes.data.length === 0) {
            await bot.editMessageText(texts[lang].cityNotFound, {
                chat_id: chatId,
                message_id: waitMsg.message_id
            });
            return;
        }
        
        // Извлечение данных из ответа
        const { lat, lon, local_names } = geoRes.data[0];
        const nameRU = local_names?.ru || cityInput; // Используем русское название если есть

        // Собираем всю информацию сразу
        const [year, description, attractions, weatherRes] = await Promise.all([
            getOfficialYear(nameRU, lang), // Год основания
            getDescription(nameRU, lang), // Описание
            getAttractionsFromOSM(nameRU, lat, lon, lang), // Достопримечательности
            axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric&lang=${lang === 'bel' ? 'ru' : 'ru'}`) // Погода
        ]);

        const temp = Math.round(weatherRes.data.main.temp); // Температура
        const yLink = `https://yandex.by/maps/?text=${encodeURIComponent('Отели и достопримечательности ' + nameRU)}`; // Ссылка на Яндекс.Карты

        // Переводим погоду на белорусский
        let weatherDescription = weatherRes.data.weather[0].description;
        if (lang === 'bel') {
            const weatherTranslations = {
                'ясно': 'ясна',
                'небольшая облачность': 'невялікая воблачнасць',
                'облачно с прояснениями': 'воблачна з праясненнямі',
                'пасмурно': 'пахмурна',
                'дождь': 'дождж',
                'небольшой дождь': 'невялікі дождж',
                'снег': 'снег',
                'небольшой снег': 'невялікі снег',
                'туман': 'туман',
                'переменная облачность': 'пераменная воблачнасць'
            };
            weatherDescription = weatherTranslations[weatherDescription] || weatherDescription;
        }

        // Формирование финального ответа
        const finalMsg = lang === 'bel'
            ? `🏙️ *${nameRU.toUpperCase()}*\n` +
              `📅 *Год заснавання:* ${year}\n\n` +
              `📜 *Пра горад:* ${description}\n\n` +
              `🏛️ *КУДЫ СХАДЗІЦЬ:*\n${attractions}\n\n` +
              `🌡️ *Надвор'е:* ${temp}°C, ${weatherDescription}\n\n` +
              `🏨 [ГАСЦІНІЦЫ І КАРТА ГОРАДА](${yLink})`
            : `🏙️ *${nameRU.toUpperCase()}*\n` +
              `📅 *Год основания:* ${year}\n\n` +
              `📜 *О городе:* ${description}\n\n` +
              `🏛️ *КУДА СХОДИТЬ:*\n${attractions}\n\n` +
              `🌡️ *Погода:* ${temp}°C, ${weatherDescription}\n\n` +
              `🏨 [ОТЕЛИ И КАРТА ГОРОДА](${yLink})`;

        // Показываем результат
        await bot.editMessageText(finalMsg, {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown',
            disable_web_page_preview: false // Включаем предпросмотр для ссылки на карты
        });
        
    } catch (error) {
        // Если что-то пошло не так  (обработка ошибок)
        try {
            await bot.sendMessage(chatId, texts[lang].error);
        } catch (e) {}
    }
}

//  БЛОК 6: ОСНОВНОЙ ОБРАБОТЧИК СООБЩЕНИЙ

bot.on('message', async (msg) => {
    const chatId = msg.chat.id; // ID чата с пользователем
    const text = msg.text; // Текст сообщения

    // Обработка команд (если это команда /start)
    if (text?.startsWith('/')) {
        if (text === '/start') {
            await showLanguageSelection(chatId);
        }
        return;
    }

    // Если у пользователя еще не выбран язык
    if (!userLanguages.has(chatId)) {
        if (text === '🇷🇺 Русский' || text === '🇧🇾 Белорусский') {
            const lang = text === '🇷🇺 Русский' ? 'rus' : 'bel';
            userLanguages.set(chatId, lang); // Сохраняем выбор языка
            await showWelcomeMessage(chatId, lang);
        } else {
            await showLanguageSelection(chatId);
        }
        return;
    }

    const lang = userLanguages.get(chatId); // Получаем язык пользователя

    // Обработка смены языка (если пользователь хочет сменить язык)
    if (text === texts[lang].changeLang || text === '🇷🇺 Русский' || text === '🇧🇾 Белорусский') {
        if (text === texts[lang].changeLang) {
            await showLanguageSelection(chatId);
            userStates.delete(chatId); // Сбрасываем состояние
            return;
        } else if (text === '🇷🇺 Русский' || text === '🇧🇾 Белорусский') {
            const newLang = text === '🇷🇺 Русский' ? 'rus' : 'bel';
            userLanguages.set(chatId, newLang); // Обновляем язык
            await showWelcomeMessage(chatId, newLang);
            return;
        }
    }

    // Обработка выбора области (если пользователь выбирает область)
    if (userStates.get(chatId) === 'awaiting_region') {
        const regionKey = Object.keys(belarusRegions[lang]).find(key => 
            belarusRegions[lang][key] === text
        );
        
        if (regionKey) {
            const regionName = belarusRegions[lang][regionKey];
            const carCode = regionLicenseCodes[regionKey];
            
            const waitMsg = await bot.sendMessage(chatId, texts[lang].loadingRegion);
            
            try {
                const regionNameForAPI = regionNamesForAPI[regionKey];
                const description = await getDescription(regionNameForAPI, lang);
                
                await bot.editMessageText(
                    texts[lang].regionInfo(regionName, carCode, description),
                    {
                        chat_id: chatId,
                        message_id: waitMsg.message_id,
                        parse_mode: 'Markdown'
                    }
                );
            } catch (error) {
                await bot.editMessageText(
                    texts[lang].apiError,
                    {
                        chat_id: chatId,
                        message_id: waitMsg.message_id
                    }
                );
            }
            
            await showRegionsMenu(chatId, lang);
            return;
        }
    }

    // Обработка кнопок меню
    switch(text) {
        case texts[lang].changeLang:
            await showLanguageSelection(chatId);
            break;
        case texts[lang].regions:
            await showRegionsMenu(chatId, lang);
            break;
        case texts[lang].back:
            if (userStates.get(chatId) === 'awaiting_region') {
                userStates.delete(chatId); // Выход из состояния ожидания
            }
            break;
        default:
            // Если текст не является командой, обрабатываем как поиск города(если это не кнопка, значит это название города)
            if (text && text.length > 1) {
                if (text !== '🇷🇺 Русский' && text !== '🇧🇾 Белорусский') {
                    await handleCitySearch(chatId, text, lang);
                }
            }
    }
});

// БЛОК 7: ОБРАБОТЧИК КОМАНД И ЗАПУСК

// Когда пользователь пишет /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    userLanguages.delete(chatId); // Сброс языка
    userStates.delete(chatId); // Сброс состояния
    await showLanguageSelection(chatId); // Показать выбор языка
});

// Запуск бота (Сообщения при запуске бота в терминале)
console.log('🚀 Навигатор по Беларуси запущен!');
console.log('👥 Разработчики: Соловьёв Никита (@ruzhikus) и Кураш Константин (@confuseduser11111)');
console.log('\n📋 СТРУКТУРА КОДА:');
console.log('🚀 Блок 1: Инициализация - Настройка окружения, библиотек, бота');
console.log('🗄️ Блок 2: Данные - Константы, тексты, коллекции состояний');
console.log('🔌 Блок 3: API - Все внешние интеграции (OpenWeather, Wikipedia, OSM)');
console.log('👋 Блок 4: Интерфейс - Приветствие, меню, клавиатуры');
console.log('🔍 Блок 5: Поиск - Логика обработки запросов городов');
console.log('🎮 Блок 6: Обработчик - Основная логика маршрутизации сообщений');
console.log('🎯 Блок 7: Запуск - Команды и инициализация');