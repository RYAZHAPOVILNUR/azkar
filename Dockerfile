FROM node:20-alpine

# ffmpeg + yt-dlp (через pip, чтобы работал плагин PO-token) для радио-прокси (аудио из YouTube-лайва).
# Плагин bgutil-ytdlp-pot-provider обходит антибот-проверку YouTube с дата-центрового IP —
# резолвит эфир через отдельный контейнер bgutil-provider (см. ops/radio-provider).
RUN apk add --no-cache ffmpeg python3 py3-pip \
 && pip3 install --no-cache-dir --break-system-packages yt-dlp "bgutil-ytdlp-pot-provider==1.3.1"

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
