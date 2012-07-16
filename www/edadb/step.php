<?php
require_once('thrift.php');

$stepcount = (int)$_GET['n'];

$transport->open();
$client->step($stepcount);
echo('step done');
$transport->close();

