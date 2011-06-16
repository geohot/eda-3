<?php

function shex($num, $len = 0) {
  $ret = strtoupper(dechex($num));
  while (strlen($ret) < $len) {
    $ret = '0' . $ret;
  }
  return $ret;
}

function hexdump($data) {
  $ret = '';
  for ($i = 0; $i < strlen($data); $i++) {
    $ret .= shex(ord(substr($data, $i, 1)), 2).' ';
  }
  return $ret;
}
