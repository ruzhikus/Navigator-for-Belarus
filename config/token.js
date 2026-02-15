// ==================================================
// Файл конфигурации: загружает переменные окружения
// и предоставляет доступ к токенам и ключам API.
// ==================================================

require('dotenv').config(); // Загрузка переменных из файла .env

// Экспортируем объект с токеном бота и ключом OpenWeather
module.exports = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN, // Токен Telegram-бота (из .env)
    WEATHER_KEY: process.env.OPENWEATHER_API_KEY        // Ключ для OpenWeather API (из .env)
};
