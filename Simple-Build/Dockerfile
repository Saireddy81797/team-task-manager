FROM node:22

WORKDIR /app

COPY . .

RUN npm install -g pnpm
RUN pnpm install --no-frozen-lockfile
RUN pnpm run build

CMD ["node", "artifacts/api-server/index.js"]
