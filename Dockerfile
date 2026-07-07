FROM node:20-alpine

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
