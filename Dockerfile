FROM node:16

WORKDIR /app

COPY  package.json ./

RUN npm install

COPY . ./

ENV PORT=7779

EXPOSE 7779

CMD [ "npm","start" ]