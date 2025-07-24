# Используем официальный образ Node.js
FROM node:24-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальной код приложения
COPY . .

# Указываем команду для запуска бота
CMD ["node", "index.js"]