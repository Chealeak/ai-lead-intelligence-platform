<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactory;

final class ApiRateLimiter
{
    public function __construct(
        private RateLimiterFactory $conversationCreateLimiter,
        private RateLimiterFactory $conversationMessageIpLimiter,
        private RateLimiterFactory $conversationMessageLimiter,
        private RateLimiterFactory $leadAnalysisLimiter,
        private ApiSecurity $security,
    ) {
    }

    public function limitConversationCreation(Request $request): ?JsonResponse
    {
        return $this->consume($this->conversationCreateLimiter, 'ip:'.$this->clientKey($request));
    }

    public function limitConversationMessage(Request $request, string $publicId): ?JsonResponse
    {
        return $this->consume($this->conversationMessageIpLimiter, 'ip:'.$this->clientKey($request))
            ?? $this->consume($this->conversationMessageLimiter, 'conversation:'.$publicId);
    }

    public function limitLeadAnalysis(Request $request): ?JsonResponse
    {
        return $this->consume($this->leadAnalysisLimiter, 'ip:'.$this->clientKey($request));
    }

    private function consume(RateLimiterFactory $factory, string $key): ?JsonResponse
    {
        $limit = $factory->create(hash('sha256', $key))->consume();

        if ($limit->isAccepted()) {
            return null;
        }

        $retryAfter = max(1, $limit->getRetryAfter()->getTimestamp() - time());

        return new JsonResponse(
            ['error' => 'Too many requests. Please try again later.'],
            JsonResponse::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) $retryAfter]
        );
    }

    private function clientKey(Request $request): string
    {
        $forwardedClient = $request->headers->get('X-Widget-Client-Ip', '');

        if (
            $forwardedClient !== ''
            && filter_var($forwardedClient, FILTER_VALIDATE_IP)
            && $this->security->isInternalService($request)
        ) {
            return $forwardedClient;
        }

        return $request->getClientIp() ?? 'unknown';
    }
}
