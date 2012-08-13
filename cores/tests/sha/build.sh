#!/bin/sh
arm-elf-gcc-4.6 -nostdlib main.c sha1.c -o sha1
gcc -nostdlib -m32 -Wl,-e,_main main.c sha1.c -o sha1_x86
