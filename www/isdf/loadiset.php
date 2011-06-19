<?php

// OMG this can open any file on your computer :P
$data = file_get_contents('../../isdf/'.$_GET['iset'].'.isdf2');

echo $data;

