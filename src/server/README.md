# tiny-server — C++ HTTP 静态文件服务器

Linux 体系编程课程项目，用 Linux 系统调用实现一个生产级静态 HTTP 服务器。

## 架构

```
main()
  ├─ 解析命令行参数（-root / -port / -workers）
  ├─ socket() → bind() → listen()
  ├─ chroot() + setuid(nobody)
  ├─ fork() × N 个 worker 进程
  │    └─ worker_run():
  │         ├─ epoll_create1()
  │         ├─ epoll_ctl(ADD, listen_fd, EPOLLIN|EPOLLET)
  │         ├─ epoll_ctl(ADD, eventfd, EPOLLIN)   ← 信号唤醒
  │         └─ while (running):
  │              ├─ accept4() → epoll_ctl(ADD, conn_fd)
  │              ├─ EPOLLIN  → read() → parse → prepare → send
  │              └─ EPOLLOUT → continue send()
  └─ waitpid() 等待所有 worker 退出
```

## 课程知识点

| Linux 系统调用 | 在代码中的用途 |
|---|---|
| `epoll_create1`, `epoll_ctl`, `epoll_wait` | IO 多路复用，边缘触发管理数千并发连接 |
| `accept4` | 接受 TCP 连接，一步设置非阻塞 + CLOEXEC |
| `sendfile` | 零拷贝发送文件，不经过用户态缓冲区 |
| `fork` | 创建 worker 进程分担负载 |
| `chdir` + `chroot` | 切换根目录，限制文件系统访问范围 |
| `setuid` + `setgid` | 绑定端口后放弃 root 权限 |
| `eventfd` | 信号处理程序通知 epoll 事件循环退出 |
| `sigaction` | 注册 SIGTERM / SIGINT 优雅关闭 |
| `writev` / `sendfile` | 响应头 + 文件体发送 |
| `TCP_NODELAY` | 禁用 Nagle 算法，减少延迟 |

## 编译

```bash
# Linux (Docker 内)
make

# 或用 g++ 直接编译
g++ -O2 -static -Wall -Wextra -o tiny-server main.c http.c response.c mime.c
```

## 运行

```bash
# 开发测试
./tiny-server -root ../../dist -port 3000 -workers 2

# 生产部署 (Docker)
docker compose up -d --build
```

## 命令行参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `-root` | `/var/www` | Web 根目录 |
| `-port` | `80` | 监听端口 |
| `-workers` | `4` | Worker 进程数 |
| `-help` | — | 显示帮助 |

## 设计要点

- **边缘触发 epoll**：每次 `epoll_wait` 返回后，调用者必须循环读写直到 `EAGAIN`，否则会丢失事件
- **SPA 路由回退**：请求路径若无文件扩展名且文件不存在，自动返回 `/index.html`
- **Keep-Alive**：支持 HTTP/1.1 长连接，减少 TCP 握手开销
- **静态编译**：`-static` 编译，镜像无需任何动态库，适合 Docker scratch 场景
- **chroot 隔离**：绑定端口后立即 chroot 到 Web 根目录，即使有漏洞也无法访问宿主机文件
