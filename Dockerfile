FROM node:18-alpine

WORKDIR /app

COPY package*.json .

RUN npm install

COPY prisma ./prisma/

COPY . .

EXPOSE 3000

RUN ["npx", "prisma", "generate"]
CMD ["npm", "run", "start"]