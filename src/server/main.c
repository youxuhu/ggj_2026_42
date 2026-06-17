#include "server.h"
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <pwd.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/eventfd.h>
#include <sys/socket.h>
#include <sys/wait.h>
#include <unistd.h>

/* ------------------------------------------------------------------ */
/*  connection pool                                                    */
/* ------------------------------------------------------------------ */
static struct connection g_conns[MAX_CONNS];

void conn_init(void) {
    for (int i = 0; i < MAX_CONNS; i++)
        g_conns[i].fd = -1;
}

struct connection *conn_get(int fd) {
    if (fd < 0 || fd >= MAX_CONNS || g_conns[fd].fd != fd)
        return NULL;
    return &g_conns[fd];
}

struct connection *conn_alloc(int fd) {
    if (fd < 0 || fd >= MAX_CONNS)
        return NULL;
    struct connection *c = &g_conns[fd];
    memset(c, 0, sizeof(*c));
    c->fd = fd;
    c->file_fd = -1;
    return c;
}

void conn_free(int fd) {
    if (fd < 0 || fd >= MAX_CONNS)
        return;
    struct connection *c = &g_conns[fd];
    if (c->file_fd >= 0) {
        close(c->file_fd);
        c->file_fd = -1;
    }
    memset(c, 0, sizeof(*c));
    c->fd = -1;
}

/* ------------------------------------------------------------------ */
/*  signal / shutdown                                                  */
/* ------------------------------------------------------------------ */
volatile int g_running = 1;
int g_wake_fd = -1;

static void sig_handler(int sig) {
    (void)sig;
    g_running = 0;
    if (g_wake_fd >= 0) {
        uint64_t val = 1;
        write(g_wake_fd, &val, sizeof(val));
    }
}

/* ------------------------------------------------------------------ */
/*  helper: close connection                                           */
/* ------------------------------------------------------------------ */
static void close_conn(int epoll_fd, int fd) {
    struct connection *c = conn_get(fd);
    if (c) {
        epoll_ctl(epoll_fd, EPOLL_CTL_DEL, fd, NULL);
        if (c->file_fd >= 0) {
            close(c->file_fd);
            c->file_fd = -1;
        }
        close(fd);
        conn_free(fd);
    }
}

/* ------------------------------------------------------------------ */
/*  read + write handlers                                              */
/* ------------------------------------------------------------------ */
static int req_complete(struct connection *c) {
    return memmem(c->buf, c->buf_len, "\r\n\r\n", 4) != NULL;
}

static void handle_read(int epoll_fd, int fd) {
    struct connection *c = conn_get(fd);
    if (!c) return;

    while (1) {
        if (c->buf_len >= BUF_SIZE) {
            close_conn(epoll_fd, fd);
            return;
        }
        ssize_t n = read(fd, c->buf + c->buf_len, BUF_SIZE - c->buf_len);
        if (n < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK)
                break;
            close_conn(epoll_fd, fd);
            return;
        }
        if (n == 0) {
            close_conn(epoll_fd, fd);
            return;
        }
        c->buf_len += (size_t)n;

        if (req_complete(c)) {
            if (parse_request(c) != 0) {
                /* error already sent by parse_request */
                if (c->header_len > 0)
                    goto send_it;
                close_conn(epoll_fd, fd);
                return;
            }
send_it:
            if (c->state == CONN_READ)
                prepare_response(c, NULL);

            int ret = try_send(c);
            if (ret == 0) {
                /* need EPOLLOUT */
                struct epoll_event ev;
                ev.events = EPOLLIN | EPOLLOUT | EPOLLET | EPOLLRDHUP;
                ev.data.fd = fd;
                epoll_ctl(epoll_fd, EPOLL_CTL_MOD, fd, &ev);
            } else if (ret < 0 || ret == 2) {
                close_conn(epoll_fd, fd);
            }
            /* ret == 1: keep-alive, already reset, just keep EPOLLIN */
            break;
        }
    }
}

static void handle_write(int epoll_fd, int fd) {
    struct connection *c = conn_get(fd);
    if (!c) return;

    int ret = try_send(c);
    if (ret == 0) {
        /* still need EPOLLOUT – keep it set */
        return;
    }

    if (ret == 1) {
        /* fully sent, keep-alive */
        struct epoll_event ev;
        ev.events = EPOLLIN | EPOLLET | EPOLLRDHUP;
        ev.data.fd = fd;
        epoll_ctl(epoll_fd, EPOLL_CTL_MOD, fd, &ev);
        return;
    }

    /* error or close */
    close_conn(epoll_fd, fd);
}

/* ------------------------------------------------------------------ */
/*  worker process                                                     */
/* ------------------------------------------------------------------ */
static void worker_run(int listen_fd, int wake_fd) {
    int epoll_fd = epoll_create1(EPOLL_CLOEXEC);
    if (epoll_fd < 0) {
        perror("epoll_create1");
        exit(1);
    }

    /* add listen fd */
    struct epoll_event ev;
    ev.events = EPOLLIN | EPOLLET;
    ev.data.fd = listen_fd;
    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, listen_fd, &ev) < 0) {
        perror("epoll_ctl listen");
        exit(1);
    }

    /* add wake fd (eventfd) */
    g_wake_fd = wake_fd;
    ev.events = EPOLLIN;
    ev.data.fd = g_wake_fd;
    if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, g_wake_fd, &ev) < 0) {
        perror("epoll_ctl wake");
        exit(1);
    }

    struct epoll_event events[64];

    while (g_running) {
        int nfds = epoll_wait(epoll_fd, events, 64, -1);
        if (nfds < 0) {
            if (errno == EINTR) continue;
            break;
        }

        for (int i = 0; i < nfds; i++) {
            int fd = events[i].data.fd;

            if (fd == listen_fd) {
                /* accept all pending connections */
                while (1) {
                    struct sockaddr_in addr;
                    socklen_t alen = sizeof(addr);
                    int cfd = accept4(listen_fd, (struct sockaddr *)&addr,
                                      &alen, SOCK_NONBLOCK | SOCK_CLOEXEC);
                    if (cfd < 0) {
                        if (errno == EAGAIN || errno == EWOULDBLOCK)
                            break;
                        break;
                    }
                    /* disable Nagle */
                    int yes = 1;
                    setsockopt(cfd, IPPROTO_TCP, TCP_NODELAY, &yes, sizeof(yes));

                    struct connection *conn = conn_alloc(cfd);
                    if (!conn) {
                        close(cfd);
                        continue;
                    }
                    conn->state = CONN_READ;

                    struct epoll_event cev;
                    cev.events = EPOLLIN | EPOLLET | EPOLLRDHUP;
                    cev.data.fd = cfd;
                    epoll_ctl(epoll_fd, EPOLL_CTL_ADD, cfd, &cev);
                }
                continue;
            }

            if (fd == g_wake_fd) {
                uint64_t val;
                read(g_wake_fd, &val, sizeof(val));
                break;
            }

            /* client connection */
            if (events[i].events & (EPOLLERR | EPOLLHUP | EPOLLRDHUP)) {
                close_conn(epoll_fd, fd);
                continue;
            }

            if (events[i].events & EPOLLIN)
                handle_read(epoll_fd, fd);

            if (events[i].events & EPOLLOUT)
                handle_write(epoll_fd, fd);
        }
    }

    close(epoll_fd);
}

/* ------------------------------------------------------------------ */
/*  usage / parse args                                                 */
/* ------------------------------------------------------------------ */
static void print_usage(const char *prog) {
    fprintf(stderr,
        "Usage: %s [options]\n"
        "Options:\n"
        "  -root <dir>   Web root directory  (default: /var/www)\n"
        "  -port <n>     Listening port      (default: 80)\n"
        "  -workers <n>  Number of workers   (default: 4)\n"
        "  -help         Show this help\n",
        prog);
}

static void parse_args(int argc, char **argv, struct config *cfg) {
    strncpy(cfg->root, "/var/www", sizeof(cfg->root) - 1);
    cfg->port = 80;
    cfg->workers = 4;

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-root") == 0 && i + 1 < argc) {
            strncpy(cfg->root, argv[++i], sizeof(cfg->root) - 1);
        } else if (strcmp(argv[i], "-port") == 0 && i + 1 < argc) {
            cfg->port = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-workers") == 0 && i + 1 < argc) {
            cfg->workers = atoi(argv[++i]);
            if (cfg->workers < 1) cfg->workers = 1;
            if (cfg->workers > MAX_WORKERS) cfg->workers = MAX_WORKERS;
        } else if (strcmp(argv[i], "-help") == 0) {
            print_usage(argv[0]);
            exit(0);
        }
    }
}

/* ------------------------------------------------------------------ */
/*  main                                                              */
/* ------------------------------------------------------------------ */
int main(int argc, char **argv) {
    struct config cfg;
    parse_args(argc, argv, &cfg);

    /* --- create socket --- */
    int listen_fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
    if (listen_fd < 0) { perror("socket"); return 1; }

    int yes = 1;
    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof(yes));
#ifdef SO_REUSEPORT
    setsockopt(listen_fd, SOL_SOCKET, SO_REUSEPORT, &yes, sizeof(yes));
#endif

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port   = htons((uint16_t)cfg.port);
    addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(listen_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(listen_fd);
        return 1;
    }

    if (listen(listen_fd, SOMAXCONN) < 0) {
        perror("listen");
        close(listen_fd);
        return 1;
    }

    fprintf(stderr, "[info] listening on 0.0.0.0:%d\n", cfg.port);

    /* --- chroot + drop privileges --- */
    uid_t nobody_uid = 65534;
    gid_t nobody_gid = 65534;
    struct passwd *pw = getpwnam("nobody");
    if (pw) {
        nobody_uid = pw->pw_uid;
        nobody_gid = pw->pw_gid;
    }

    if (chdir(cfg.root) != 0) {
        perror("chdir");
        return 1;
    }
    if (chroot(cfg.root) != 0) {
        perror("chroot");
        return 1;
    }

    if (setgid(nobody_gid) < 0 || setuid(nobody_uid) < 0) {
        perror("setuid/setgid");
        return 1;
    }
    fprintf(stderr, "[info] chroot to %s, uid=%d, gid=%d\n",
            cfg.root, nobody_uid, nobody_gid);

    /* --- create eventfd for wakeup --- */
    g_wake_fd = eventfd(0, EFD_NONBLOCK | EFD_CLOEXEC);
    if (g_wake_fd < 0) { perror("eventfd"); return 1; }

    /* --- signal handlers --- */
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = sig_handler;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGTERM, &sa, NULL);
    sigaction(SIGINT,  &sa, NULL);
    signal(SIGPIPE, SIG_IGN);

    /* --- fork workers --- */
    conn_init();

    fprintf(stderr, "[info] forking %d worker(s)...\n", cfg.workers);
    for (int i = 0; i < cfg.workers; i++) {
        pid_t pid = fork();
        if (pid < 0) { perror("fork"); return 1; }
        if (pid == 0) {
            /* child */
            worker_run(listen_fd, g_wake_fd);
            _exit(0);
        }
        fprintf(stderr, "[info] worker %d started, pid=%d\n", i, (int)pid);
    }

    close(g_wake_fd);
    close(listen_fd);

    /* --- wait for all workers --- */
    while (1) {
        int status;
        pid_t pid = waitpid(-1, &status, 0);
        if (pid < 0) {
            if (errno == ECHILD) break;
            if (errno == EINTR) continue;
            break;
        }
        fprintf(stderr, "[info] worker pid=%d exited, status=%d\n",
                (int)pid, WEXITSTATUS(status));
    }

    fprintf(stderr, "[info] all workers exited, bye.\n");
    return 0;
}
