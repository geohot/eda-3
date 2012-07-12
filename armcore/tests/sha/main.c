#include "sha1.h"

int main() {
  uint32_t out[5];
  SHA1Context ctx;
  SHA1Reset(&ctx);
  SHA1Input(&ctx, "hello", 5);
  SHA1Result(&ctx, (uint8_t*)out);
  if (out[0] == 0x1dc6f4aa) return 0x1234;
  else return 0x5678;
}

