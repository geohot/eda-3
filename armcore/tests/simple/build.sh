#!/bin/sh
arm-elf-gcc-4.6 -nostdlib main.c -o simple.elf
arm-elf-objcopy -Obinary simple.elf simple.bin@8000
