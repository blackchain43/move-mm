FROM node:18-alpine AS builder
RUN apk add --update --no-cache python3 make gcc libsass g++
WORKDIR /usr/src/app
COPY . ./
RUN npm install
RUN npm run build 

FROM node:18-alpine AS runtime
WORKDIR /usr/src/app
RUN chown -R node:node /usr/src
USER node
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package-lock.json ./package-lock.json
CMD ["node","dist/main"]