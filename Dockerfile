# Stage 1: compile C server
FROM alpine:3.21 AS cbuild
RUN apk add --no-cache g++ musl-dev make
COPY src/server/ /app/server/
WORKDIR /app/server
RUN make

# Stage 2: build Vue frontend
FROM node:22-slim AS frontend
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 3: runtime — tiny-server + dist
FROM alpine:3.21
EXPOSE 80

COPY --from=cbuild /app/server/tiny-server /usr/local/bin/
COPY --from=frontend /app/dist /var/www

CMD ["tiny-server", "-root", "/var/www", "-port", "80", "-workers", "4"]
