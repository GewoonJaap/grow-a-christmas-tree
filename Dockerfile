FROM node:18-alpine AS base

WORKDIR /usr/app

# Install dependencies

COPY package.json .
COPY yarn.lock .

RUN yarn install && yarn cache clean

# Build
FROM base AS builder

COPY src ./src

RUN yarn build

# Copy and run
FROM base AS runner

COPY .env .
COPY --from=builder /usr/app/dist ./dist

CMD yarn dockerStart
