#!/bin/sh
arm-elf-gcc-4.6 -nostdlib main.c -o simple
arm-elf-objcopy -Obinary simple simple.bin@8000
