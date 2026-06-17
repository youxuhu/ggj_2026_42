#ifndef SERVER_H
#define SERVER_H

#include <sys/types.h>
#include <stddef.h>

#define MAX_PATH      1024
#define BUF_SIZE      8192
#define HEADER_SIZE   2048
#define MAX_CONNS     4096
#define MAX_WORKERS   16

enum conn_state {
    CONN_READ,
    CONN_SEND_HEADER,
    CONN_SEND_BODY,
    CONN_DONE
};

struct request {
    char method[16];
    char path[MAX_PATH];
    char decoded[MAX_PATH];
};

struct connection {
    int  fd;
    int  state;
    struct request req;
    char buf[BUF_SIZE];
    size_t buf_len;
    char header[HEADER_SIZE];
    size_t header_len;
    size_t header_sent;
    int file_fd;
    off_t file_offset;
    off_t file_size;
    int keep_alive;
};

struct config {
    char root[MAX_PATH];
    int port;
    int workers;
};

/* connections.c */
void conn_init(void);
struct connection *conn_get(int fd);
struct connection *conn_alloc(int fd);
void conn_free(int fd);

/* main.c (declared for cross-file signal access) */
extern volatile int g_running;
extern int g_wake_fd;

/* http.c */
int parse_request(struct connection *c);
int url_decode(const char *src, char *dst, size_t size);
const char *path_ext(const char *path);

/* response.c */
int prepare_response(struct connection *c, const struct config *cfg);
int try_send(struct connection *c);
int send_error_page(struct connection *c, int code, const char *text);

/* mime.c */
const char *mime_type(const char *ext);

#endif
