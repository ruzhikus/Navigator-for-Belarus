// ==================================================
// Сервис для взаимодействия с OpenWeather API.
// Содержит функции для проверки принадлежности города к Беларуси
// и получения текущей погоды по координатам.
// ==================================================

const axios = require('axios');
const { WEATHER_KEY } = require('../config/token'); // Подключаем ключ OpenWeather

// Проверяет, находится ли указанный город в Беларуси.
// Использует геокодинг OpenWeather: запрашивает координаты города
// и анализирует код страны (должен быть 'BY').
// Принимает название города, возвращает true, если город в Беларуси.
async function isCityInBelarus(city) {
    try {
        // Запрос к геокодирующему API OpenWeather для определения страны города
        const { data } = await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_KEY}`);
        // Если ответ содержит данные и страна - Беларусь (BY)
        return data[0]?.country === 'BY';
    } catch {
        // При ошибке (сетевой, недоступность) считаем, что город не в Беларуси
        return false;
    }
}

// Получает текущую погоду по координатам.
// Принимает широту и долготу, возвращает объект с данными погоды от OpenWeather.
async function getWeather(lat, lon) {
    // Запрос к API погоды с параметрами: метрическая система, язык русский
    const { data } = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric&lang=ru`);
    return data;
}

module.exports = { isCityInBelarus, getWeather };