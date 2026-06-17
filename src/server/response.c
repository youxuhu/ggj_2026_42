#include "server.h"
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/sendfile.h>
#include <sys/stat.h>
#include <unistd.h>

/* forward-declare the connection table helpers we need */
extern struct connection g_conns[];

static void build_header(struct connection *c, int status,
                         const char *status_text,
                         const char *content_type, long content_len) {
    c->header_len = (size_t)snprintf(
        c->header, sizeof(c->header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %ld\r\n"
        "Connection: %s\r\n"
        "\r\n",
        status, status_text,
        content_type,
        content_len,
        c->keep_alive ? "keep-alive" : "close");
    c->header_sent = 0;
    c->state = CONN_SEND_HEADER;
}

int send_error_page(struct connection *c, int code, const char *text) {
    char body[256];
    int n = snprintf(body, sizeof(body), "%d %s\n", code, text);
    c->keep_alive = 0;
    build_header(c, code, text, "text/plain", n);
    /* append body after header */
    if ((size_t)n < sizeof(body)) {
        size_t remain = sizeof(c->header) - c->header_len;
        size_t copy = (size_t)n < remain ? (size_t)n : remain;
        memcpy(c->header + c->header_len, body, copy);
        c->header_len += copy;
    }
    c->file_fd = -1;
    c->state = CONN_SEND_HEADER;
    return -1;
}

int prepare_response(struct connection *c, const struct config *cfg) {
    (void)cfg;
    const char *path = c->req.decoded;

    /* skip leading slashes */
    while (*path == '/') path++;

    /* build filesystem path */
    char fpath[MAX_PATH];
    snprintf(fpath, sizeof(fpath), "/%s", *path ? path : "index.html");

    struct stat st;
    if (stat(fpath, &st) != 0 || S_ISDIR(st.st_mode)) {
        /* SPA fallback: check if path has extension; if not, serve index.html */
        const char *ext = path_ext(c->req.decoded);
        if (!ext || *ext == '\0' || *ext == '/') {
            snprintf(fpath, sizeof(fpath), "/index.html");
            if (stat(fpath, &st) != 0)
                return send_error_page(c, 404, "Not Found");
        } else {
            if (stat(fpath, &st) != 0)
                return send_error_page(c, 404, "Not Found");
        }
    }

    c->file_fd = open(fpath, O_RDONLY);
    if (c->file_fd < 0)
        return send_error_page(c, 404, "Not Found");

    c->file_size = st.st_size;
    c->file_offset = 0;

    build_header(c, 200, "OK",
                 mime_type(path_ext(fpath)),
                 c->file_size);
    c->state = CONN_SEND_HEADER;
    return 0;
}

int try_send(struct connection *c) {
    /* send header */
    while (c->header_sent < c->header_len) {
        ssize_t n = write(c->fd,
                          c->header + c->header_sent,
                          c->header_len - c->header_sent);
        if (n < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK)
                return 0;
            return -1;
        }
        c->header_sent += (size_t)n;
    }

    /* send file body */
    if (c->file_fd >= 0) {
        while (c->file_offset < c->file_size) {
            off_t offset = c->file_offset;
            size_t remain = (size_t)(c->file_size - c->file_offset);
            ssize_t n = sendfile(c->fd, c->file_fd, &offset, remain);
            if (n < 0) {
                if (errno == EAGAIN || errno == EWOULDBLOCK) {
                    c->file_offset = offset;
                    return 0;
                }
                return -1;
            }
            c->file_offset = offset;
        }
        close(c->file_fd);
        c->file_fd = -1;
    }

    /* fully sent */
    if (c->keep_alive) {
        /* reset for next request */
        c->buf_len = 0;
        c->header_sent = 0;
        c->file_offset = 0;
        c->file_size = 0;
        c->state = CONN_READ;
        return 1;
    }

    c->state = CONN_DONE;
    return 2;
}
