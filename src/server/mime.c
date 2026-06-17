#include "server.h"
#include <string.h>

struct mime_entry {
    const char *ext;
    const char *type;
};

static const struct mime_entry table[] = {
    { "html", "text/html" },
    { "htm",  "text/html" },
    { "css",  "text/css" },
    { "js",   "application/javascript" },
    { "json", "application/json" },
    { "png",  "image/png" },
    { "jpg",  "image/jpeg" },
    { "jpeg", "image/jpeg" },
    { "gif",  "image/gif" },
    { "svg",  "image/svg+xml" },
    { "ico",  "image/x-icon" },
    { "wav",  "audio/wav" },
    { "mp3",  "audio/mpeg" },
    { "woff", "font/woff" },
    { "woff2","font/woff2" },
    { "ttf",  "font/ttf" },
    { "pdf",  "application/pdf" },
    { "txt",  "text/plain" },
    { "xml",  "application/xml" },
    { NULL,   "application/octet-stream" },
};

const char *mime_type(const char *ext) {
    if (!ext || !*ext)
        return "application/octet-stream";
    for (int i = 0; table[i].ext; i++) {
        if (strcasecmp(ext, table[i].ext) == 0)
            return table[i].type;
    }
    return "application/octet-stream";
}
