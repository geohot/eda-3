<?php
require_once('thrift.php');

$tagdata = file_get_contents('php://input');

$transport->open();
$client->setTag($_GET['addr'], $_GET['tagname'], $tagdata);
$transport->close();

