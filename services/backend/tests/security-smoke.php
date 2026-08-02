<?php

declare(strict_types=1);

use App\Entity\Conversation;
use App\Service\ApiRateLimiter;
use App\Service\ApiSecurity;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\RateLimiter\Storage\InMemoryStorage;

require dirname(__DIR__).'/vendor/autoload.php';

function ensure(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$ids = [];
for ($i = 0; $i < 100; ++$i) {
    $id = (new Conversation())->getPublicId();
    ensure((bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id), 'Invalid UUIDv4');
    $ids[$id] = true;
}
ensure(count($ids) === 100, 'Conversation identifiers must be unique');

$security = new ApiSecurity('admin-secret', 'internal-secret');
ensure($security->isAdmin(Request::create('/', server: ['HTTP_AUTHORIZATION' => 'Bearer admin-secret'])), 'Admin key rejected');
ensure(!$security->isAdmin(Request::create('/', server: ['HTTP_AUTHORIZATION' => 'Bearer wrong'])), 'Invalid admin key accepted');
ensure($security->isInternalService(Request::create('/', server: ['HTTP_X_INTERNAL_SERVICE_SECRET' => 'internal-secret'])), 'Service secret rejected');
ensure(!(new ApiSecurity('', ''))->isAdminOrInternalService(Request::create('/', server: ['HTTP_AUTHORIZATION' => 'Bearer '])), 'Empty secrets must fail closed');

$factory = static function (string $id, int $limit): RateLimiterFactory {
    return new RateLimiterFactory([
        'id' => $id,
        'policy' => 'fixed_window',
        'limit' => $limit,
        'interval' => '1 minute',
    ], new InMemoryStorage());
};
$rateLimiter = new ApiRateLimiter(
    $factory('create', 1),
    $factory('message-ip', 10),
    $factory('message', 10),
    $factory('lead', 10),
    $security,
);
$request = Request::create('/', server: ['REMOTE_ADDR' => '192.0.2.1']);
ensure($rateLimiter->limitConversationCreation($request) === null, 'First request should pass');
$rejected = $rateLimiter->limitConversationCreation($request);
ensure($rejected?->getStatusCode() === 429, 'Rate limit must return 429');
ensure($rejected->headers->has('Retry-After'), 'Rate limit must include Retry-After');

$trustedForwardingLimiter = new ApiRateLimiter(
    $factory('trusted-create', 1),
    $factory('trusted-message-ip', 10),
    $factory('trusted-message', 10),
    $factory('trusted-lead', 10),
    $security,
);
$forwardedA = Request::create('/', server: [
    'REMOTE_ADDR' => '10.0.0.10',
    'HTTP_X_INTERNAL_SERVICE_SECRET' => 'internal-secret',
    'HTTP_X_WIDGET_CLIENT_IP' => '192.0.2.10',
]);
$forwardedB = Request::create('/', server: [
    'REMOTE_ADDR' => '10.0.0.10',
    'HTTP_X_INTERNAL_SERVICE_SECRET' => 'internal-secret',
    'HTTP_X_WIDGET_CLIENT_IP' => '192.0.2.11',
]);
ensure($trustedForwardingLimiter->limitConversationCreation($forwardedA) === null, 'Trusted client IP rejected');
ensure($trustedForwardingLimiter->limitConversationCreation($forwardedB) === null, 'Trusted client IPs should have separate limits');

echo "Security smoke tests passed\n";
