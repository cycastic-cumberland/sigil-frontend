FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --force

COPY . .

ENV NODE_ENV=production

ARG VITE_BACKEND_AUTHORITY
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENV

RUN echo -e "VITE_BACKEND_AUTHORITY=${VITE_BACKEND_AUTHORITY}\nVITE_SENTRY_DSN=${VITE_SENTRY_DSN}\nVITE_SENTRY_ENV=${VITE_SENTRY_ENV}\n" > /.env
RUN npm run build

FROM nginx:1.25.3-alpine-slim

COPY conf/default.conf /etc/nginx/conf.d

COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

