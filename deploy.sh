#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 加载配置
if [ -f .env.docker ]; then
  set -a
  source .env.docker
  set +a
fi

DOCKER_HUB_USER="${DOCKER_HUB_USER:-huyouxu}"
IMAGE_NAME="${IMAGE_NAME:-ggj2026}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DEPLOY_PORT="${DEPLOY_PORT:-8080}"
CONTAINER_NAME="${CONTAINER_NAME:-ggj2026-app}"

FULL_IMAGE="${DOCKER_HUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

check_prerequisites() {
  if ! command -v docker &>/dev/null; then
    error "Docker 未安装。请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
  fi

  if ! docker compose version &>/dev/null && ! docker-compose --version &>/dev/null; then
    error "docker compose 不可用。"
    exit 1
  fi

  if ! docker info &>/dev/null; then
    error "Docker daemon 未运行。请启动 Docker Desktop。"
    exit 1
  fi
}

cmd_build() {
  check_prerequisites
  info "🚧 构建镜像: ${FULL_IMAGE}"
  DOCKER_HUB_USER="$DOCKER_HUB_USER" IMAGE_NAME="$IMAGE_NAME" IMAGE_TAG="$IMAGE_TAG" \
    docker compose build app
  info "✅ 构建完成: ${FULL_IMAGE}"
}

cmd_deploy() {
  check_prerequisites

  # 先停止已运行的容器
  docker compose down --remove-orphans 2>/dev/null || true

  info "🚀 启动服务 (端口 ${DEPLOY_PORT})..."
  DOCKER_HUB_USER="$DOCKER_HUB_USER" IMAGE_NAME="$IMAGE_NAME" IMAGE_TAG="$IMAGE_TAG" \
    DEPLOY_PORT="$DEPLOY_PORT" CONTAINER_NAME="$CONTAINER_NAME" \
    docker compose up -d

  info "⏳ 等待服务启动..."
  sleep 3

  # 健康检查
  local retries=5
  while [ $retries -gt 0 ]; do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${DEPLOY_PORT}/" 2>/dev/null | grep -q 200; then
      info "✅ 部署成功！访问地址: http://localhost:${DEPLOY_PORT}/"
      return 0
    fi
    retries=$((retries - 1))
    sleep 2
  done

  warn "⚠️  健康检查未通过，请检查日志: docker compose logs app"
  return 1
}

cmd_push() {
  check_prerequisites
  cmd_build

  # 检查 docker login
  if ! docker system info | grep -q "Username"; then
    warn "你尚未登录 Docker Hub。请先执行: docker login"
    info "按回车键继续，或 Ctrl+C 取消..."
    read -r
  fi

  info "📤 推送镜像到 Docker Hub: ${FULL_IMAGE}"
  docker tag "${DOCKER_HUB_USER}/${IMAGE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE}" 2>/dev/null || true
  docker push "${FULL_IMAGE}"
  info "✅ 推送完成！"
  info "   其他机器拉取: docker run -d -p ${DEPLOY_PORT}:80 ${FULL_IMAGE}"
}

cmd_stop() {
  check_prerequisites
  info "🛑 停止服务..."
  docker compose down --remove-orphans 2>/dev/null || true
  info "✅ 已停止"
}

cmd_restart() {
  cmd_stop
  cmd_deploy
}

cmd_help() {
  cat <<EOF
用法: ./deploy.sh <命令>

命令:
  build    仅构建 Docker 镜像
  deploy   构建并启动容器（默认命令）
  push     构建并推送到 Docker Hub
  stop     停止容器
  restart  重启容器
  --help   显示此帮助

环境变量（可通过 .env.docker 或直接传入）:
  DOCKER_HUB_USER    Docker Hub 用户名（默认: huyouxu）
  IMAGE_NAME         镜像名称（默认: ggj2026）
  IMAGE_TAG          镜像标签（默认: latest）
  DEPLOY_PORT        宿主机端口（默认: 8080）
  CONTAINER_NAME     容器名称（默认: ggj2026-app）

示例:
  ./deploy.sh                    # 等价于 deploy
  ./deploy.sh build              # 仅构建
  ./deploy.sh push               # 构建并推送到 Docker Hub
  DEPLOY_PORT=3000 ./deploy.sh   # 自定义端口
EOF
}

cmd="${1:-deploy}"

case "$cmd" in
  build)
    cmd_build
    ;;
  deploy)
    cmd_deploy
    ;;
  push)
    cmd_push
    ;;
  stop)
    cmd_stop
    ;;
  restart)
    cmd_restart
    ;;
  --help|-h)
    cmd_help
    ;;
  *)
    error "未知命令: $cmd"
    cmd_help
    exit 1
    ;;
esac
