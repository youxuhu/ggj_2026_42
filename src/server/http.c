#include "server.h"
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *find_str(const char *haystack, size_t hs_len,
                            const char *needle, size_t n_len) {
    if (n_len == 0) return haystack;
    if (hs_len < n_len) return NULL;
    for (size_t i = 0; i <= hs_len - n_len; i++) {
        if (memcmp(haystack + i, needle, n_len) == 0)
            return haystack + i;
    }
    return NULL;
}

static int ci_starts(const char *str, const char *prefix) {
    while (*prefix) {
        if (tolower((unsigned char)*str) != tolower((unsigned char)*prefix))
            return 0;
        str++; prefix++;
    }
    return 1;
}

int url_decode(const char *src, char *dst, size_t size) {
    size_t i = 0, j = 0;
    while (src[i] && j < size - 1) {
        if (src[i] == '%' && isxdigit((unsigned char)src[i+1])
                         && isxdigit((unsigned char)src[i+2])) {
            char hex[3] = { src[i+1], src[i+2], 0 };
            dst[j++] = (char)strtol(hex, NULL, 16);
            i += 3;
        } else if (src[i] == '+') {
            dst[j++] = ' ';
            i++;
        } else {
            dst[j++] = src[i++];
        }
    }
    dst[j] = '\0';
    return 0;
}

const char *path_ext(const char *path) {
    if (!path) return NULL;
    const char *dot = NULL, *slash = NULL;
    for (const char *p = path; *p; p++) {
        if (*p == '.') dot = p;
        if (*p == '/') { dot = NULL; slash = p; }
    }
    (void)slash;
    return dot ? dot + 1 : NULL;
}

int parse_request(struct connection *c) {
    const char *buf = c->buf;
    size_t len = c->buf_len;

    /* find \r\n\r\n (end of headers) */
    const char *hdr_end = find_str(buf, len, "\r\n\r\n", 4);
    if (!hdr_end) return -1;

    /* find end of first line */
    const char *eol = find_str(buf, len, "\r\n", 2);
    if (!eol) return -1;

    size_t line_len = eol - buf;
    char line[1024];
    if (line_len >= sizeof(line)) return -1;
    memcpy(line, buf, line_len);
    line[line_len] = '\0';

    /* parse "METHOD /path HTTP/1.1" */
    char ver[32];
    if (sscanf(line, "%15s %1023s %31s", c->req.method,
               c->req.path, ver) != 3)
        return -1;

    /* only GET */
    if (strcmp(c->req.method, "GET") != 0) {
        send_error_page(c, 405, "Method Not Allowed");
        return -1;
    }

    /* strip query string */
    char *q = strchr(c->req.path, '?');
    if (q) *q = '\0';

    /* URL decode */
    url_decode(c->req.path, c->req.decoded, sizeof(c->req.decoded));

    /* path traversal check */
    if (strstr(c->req.decoded, "..")) {
        send_error_page(c, 400, "Bad Request");
        return -1;
    }

    /* default: keep-alive for HTTP/1.1; check for Connection: close */
    c->keep_alive = strstr(ver, "1.1") != NULL;
    if (len >= 6) {
        const char *p = buf;
        const char *end = buf + len;
        while (p + 12 < end) {
            if (find_str(p, end - p, "Connection", 10)) {
                p = find_str(p, end - p, "Connection", 10) + 10;
                while (p < end && (*p == ':' || *p == ' ')) p++;
                if (p + 10 <= end &&
                    ci_starts(p, "keep-alive")) {
                    c->keep_alive = 1;
                }
                break;
            }
            /* skip to next line */
            const char *nl = find_str(p, end - p, "\r\n", 2);
            if (!nl) break;
            p = nl + 2;
        }
    }

    return 0;
}
