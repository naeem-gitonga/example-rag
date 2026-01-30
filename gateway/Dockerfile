FROM node:24-alpine AS deps

WORKDIR /app

COPY gateway/package*.json ./

RUN npm install

FROM node:24-alpine AS dev

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY gateway/package.json ./
COPY gateway/tsconfig.json ./
COPY gateway/src ./src

EXPOSE 8080

CMD ["npm", "run", "dev"]
