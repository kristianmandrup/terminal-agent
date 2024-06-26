FROM node:21.5.0-alpine AS base

FROM base as builder

WORKDIR /app

COPY Terminal.dockerfile /app/
COPY src/ /app/src
COPY package.json \
  package-lock.json \
  tsconfig.json \
  /app/

RUN npm install
RUN npm run build:main
RUN rm -rf node_modules/ scripts/ src/ tsconfig.json package-lock.json

FROM builder as runtime

WORKDIR /app
ENV NODE_ENV production
CMD [ "npm", "run", "start" ]
