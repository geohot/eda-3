<?php

$json = file_get_contents('php://input');
$data = json_decode($json);


if (count($data) == 0) {
  throw new Exception('need an iset to save');
}

$f = fopen('../../isdf/'.$data->{'iset'}.'.isdf2', 'w');
fwrite($f, $json);
fclose($f);

