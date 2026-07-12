FROM node:20-alpine

# ffmpeg + yt-dlp для радио-прокси (аудио из YouTube-лайва)
RUN apk add --no-cache ffmpeg yt-dlp

WORKDIR /app

# зависимости бота (кэшируемый слой)
COPY bot/package.json bot/package.json
RUN cd bot && npm install --omit=dev

# код бота + статика Mini App + лендинг
COPY bot/ bot/
COPY miniapp/ miniapp/
COPY landing/ landing/

WORKDIR /app/bot
EXPOSE 3010
CMD ["node", "server.js"]
