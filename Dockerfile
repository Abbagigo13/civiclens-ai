FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001
ENV REPORTS_DB_PATH=/data/civiclens.db
ENV REPORTS_PHOTO_DIR=/data/photos

VOLUME /data
EXPOSE 3001

CMD ["npm", "run", "server:start"]
