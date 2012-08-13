// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <libwebsockets.h>

#define PREFIX "/Users/geohot/eda-3/www"

void hexdump(void *d, int l) {
  for (int i = 0; i < l; i++) {
    if (i != 0 && (i%0x10) == 0) printf("\n");
    printf("%2.2X ", ((unsigned char*)d)[i]);
  }
  printf("\n");
}

static int callback_http(struct libwebsocket_context* context,
      struct libwebsocket* wsi,
      enum libwebsocket_callback_reasons reason, void* user,
      void* in, size_t len) {
  switch (reason) {
    case LWS_CALLBACK_HTTP: {
      /*const unsigned char *universal_response = (const unsigned char*)"Hello, World!";
      libwebsocket_write(wsi, (unsigned char*)universal_response,
        strlen((const char*)universal_response), LWS_WRITE_HTTP);*/

      printf("requested URI: %s\n", (char*)in);
     
      if (strcmp((char*)in, "/") == 0) {
        //printf("directing to universal\n");
        libwebsockets_serve_http_file(wsi, PREFIX"/universal/index.html", "text/html");
      } else if (memcmp(in, "/eda/", strlen("/eda/")) == 0) {
        char* filename = (char*)malloc(strlen((char*)in)+strlen(PREFIX)+1);
        strcpy(filename, PREFIX);
        strcat(filename, (char*)in+strlen("/eda"));
        libwebsockets_serve_http_file(wsi, filename, "text/html");
        
      }

      libwebsocket_close_and_free_session(context, wsi, LWS_CLOSE_STATUS_NORMAL);
      break;
    }
    default: {
      printf("no handler for callback: %d\n", reason);
      break;
    }
  }
  return 0;
}

static int callback_memory(struct libwebsocket_context* context,
      struct libwebsocket* wsi,
      enum libwebsocket_callback_reasons reason, void* user,
      void* in, size_t len) {
  printf("MEMORY CALLBACK: %d\n", reason);
  switch(reason) {
    case LWS_CALLBACK_ESTABLISHED:
      printf("connected to memory\n");
      break;
    case LWS_CALLBACK_RECEIVE:
      printf("got memory data\n");
      break;
  }
  return 0;
}

static struct libwebsocket_protocols protocols[] = {
  {
    "http-only",
    callback_http,
    0
  },
  {
    "memory-read",
    callback_memory,
    0
  },
  {
    NULL, NULL, 0
  }
};
  
void start_edadb_websockets() {
  int port = 9999;
  const char* interface = NULL;
  struct libwebsocket_context* context;

  context = libwebsocket_create_context(port, interface,
    protocols, libwebsocket_internal_extensions,
    NULL, NULL, -1, -1, NULL);

  printf("yay websockets\n");

  while (1) {
    libwebsocket_service(context, 50);
  }

  libwebsocket_context_destroy(context);
}

