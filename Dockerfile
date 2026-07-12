# node:22 — обязателен: yt-dlp решает JS-челлендж YouTube («n challenge») только на node>=22
# (NodeJsRuntime.MIN_SUPPORTED_VERSION=(22,0,0)); на node:20 — «No video formats found».
FROM node:22-alpine

# ffmpeg + yt-dlp (через pip, чтобы работали плагины) для радио-прокси (аудио из YouTube-лайва).
# Для эфира с дата-центрового IP нужны ВСЕ три:
#  - yt-dlp-ejs — solver-скрипты JS-челленджа (n challenge), запускаются node-раннером
#  - bgutil-ytdlp-pot-provider — PO-токен через контейнер bgutil-provider (см. ops/radio-provider)
#  - cookies.txt в томе данных (см. server.js) — снимает антибот «Sign in to confirm you're not a bot»
RUN apk add --no-cache ffmpeg python3 py3-pip \
 && pip3 install --no-cache-dir --break-system-packages yt-dlp yt-dlp-ejs "bgutil-ytdlp-pot-provider==1.3.1"

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
