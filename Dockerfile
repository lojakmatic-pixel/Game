FROM node:22-alpine
WORKDIR /app
COPY package.json server.js rooms.js ./
COPY public ./public
ENV PORT=10000 DATA_DIR=/data BV_TRUST_PROXY=1
VOLUME /data
EXPOSE 10000
CMD ["node", "server.js"]
