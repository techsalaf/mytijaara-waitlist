<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
echo "Global middleware:\n";
foreach ($kernel->getMiddleware() as $middleware) {
    echo $middleware . "\n";
}
