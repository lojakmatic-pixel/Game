FROM node:22-alpine
WORKDIR /app
COPY package.json server.js rooms.js ./
COPY public ./public
RUN mkdir -p /data && chmod 777 /data
ENV PORT=7860 DATA_DIR=/data BV_TRUST_PROXY=1
VOLUME /data
EXPOSE 7860
CMD ["node", "server.js"]
