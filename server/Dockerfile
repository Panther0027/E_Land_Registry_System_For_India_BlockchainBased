FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p uploads demo-assets && chmod +x docker-entrypoint.sh

EXPOSE 5000

ENV NODE_ENV=production
ENV RUN_SEED=true

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
