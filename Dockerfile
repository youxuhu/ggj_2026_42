# Stage 1: build
FROM node:22-slim AS build
WORKDIR /app

# pnpm 安装
RUN npm install -g pnpm@9

# 先复制依赖配置文件，利用 Docker 缓存层
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm build

# Stage 2: nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
