<?php

namespace App\Service;

use App\Entity\Conversation;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

final class ConversationAiService
{
    public function __construct(
        private HttpClientInterface $httpClient,
    ) {
    }

    /**
     * @param list<array{role: string, content: string}> $history
     *
     * @return array<string, mixed>
     */
    public function chat(
        Conversation $conversation,
        string $message,
        array $history,
        ?string $actionHint = null,
    ): array {
        try {
            $response = $this->httpClient->request(
                'POST',
                'http://ai-orchestrator:3000/chat',
                [
                    'json' => [
                        'message' => $message,
                        'history' => $history,
                        'conversationState' => $conversation->getState(),
                        'leadContext' => [
                            'email' => $conversation->getEmail(),
                            'company' => $conversation->getCompany(),
                        ],
                        'actionHint' => $actionHint,
                    ],
                    'timeout' => 90,
                ]
            );

            $statusCode = $response->getStatusCode();

            if ($statusCode >= 400) {
                throw new \RuntimeException('AI chat failed: '.$statusCode);
            }

            return $response->toArray();
        } catch (TransportExceptionInterface $exception) {
            throw new \RuntimeException('AI service unavailable', 0, $exception);
        }
    }
}
