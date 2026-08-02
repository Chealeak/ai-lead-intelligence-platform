<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;

final class ApiSecurity
{
    public function __construct(
        #[Autowire(env: 'ADMIN_API_KEY')]
        private string $adminApiKey,
        #[Autowire(env: 'INTERNAL_SERVICE_SECRET')]
        private string $internalServiceSecret,
    ) {
    }

    public function isAdmin(Request $request): bool
    {
        $authorization = $request->headers->get('Authorization', '');

        if (!str_starts_with($authorization, 'Bearer ')) {
            return false;
        }

        return $this->matches($this->adminApiKey, substr($authorization, 7));
    }

    public function isInternalService(Request $request): bool
    {
        return $this->matches(
            $this->internalServiceSecret,
            $request->headers->get('X-Internal-Service-Secret', '')
        );
    }

    public function isAdminOrInternalService(Request $request): bool
    {
        return $this->isAdmin($request) || $this->isInternalService($request);
    }

    private function matches(string $expected, string $provided): bool
    {
        return $expected !== '' && $provided !== '' && hash_equals($expected, $provided);
    }
}
