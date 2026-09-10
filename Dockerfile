FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache git
COPY package.json ./
COPY scripts ./scripts
RUN npm install --no-audit --no-fund && npm run prepare:settlemaker
COPY server.mjs ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
