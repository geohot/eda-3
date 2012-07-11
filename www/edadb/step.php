<?php
require_once('thrift.php');

$transport->open();
$client->step();
echo('step done');
$transport->close();

