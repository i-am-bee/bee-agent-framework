FROM node:alpine

WORKDIR /app

COPY .env /app
COPY package.json /app


RUN yarn  install --imutable 

COPY . .

EXPOSE 80

CMD ["yarn", "run"]