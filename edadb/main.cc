// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include <stdio.h>

extern void start_edadb();
extern void start_edadb_websockets();

int main(int argc, char** argv) {
  printf("starting the EDAdb...\n");
  printf("with ARM support\n");
  //start_edadb_websockets();
  start_edadb();
  printf("exiting...\n");
  return 0;
}

