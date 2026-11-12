FROM node:24 AS build

WORKDIR /app

COPY package.json package-lock.json ./
# --legacy-peer-deps: optional WASM peer deps are absent from the lockfile,
# which npm 11 rejects in strict `ci` mode.
RUN npm ci --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
