<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class EmbeddingService
{
    public function __construct(
        private HttpClientInterface $httpClient,
        #[Autowire(env: 'OPENROUTER_API_KEY')]
        private string $apiKey,
        #[Autowire(param: 'embedding_model')]
        private string $model,
    ) {
    }

    public function embed(string $text): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('OPENROUTER_API_KEY is not configured');
        }

        $response = $this->httpClient->request(
            'POST',
            'https://openrouter.ai/api/v1/embeddings',
            [
                'headers' => [
                    'Authorization' => 'Bearer '.$this->apiKey,
                    'Content-Type' => 'application/json',
                    'HTTP-Referer' => 'http://localhost',
                    'X-Title' => 'AI Lead Intelligence Platform',
                ],
                'json' => [
                    'model' => $this->model,
                    'input' => $text,
                ],
                'timeout' => 60,
            ]
        );

        $statusCode = $response->getStatusCode();
        $data = $response->toArray(false);

        if ($statusCode >= 400) {
            throw new \RuntimeException(
                'Embedding request failed: '.($data['error']['message'] ?? $statusCode)
            );
        }

        $embedding = $data['data'][0]['embedding'] ?? null;

        if (!is_array($embedding) || count($embedding) !== 1536) {
            throw new \RuntimeException('Unexpected embedding response shape');
        }

        return array_map('floatval', $embedding);
    }
}
