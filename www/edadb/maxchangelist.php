<?php
require_once('thrift.php');

$transport->open();
$clnumber = $client->getMaxChangelist();
$transport->close();

echo($clnumber);

