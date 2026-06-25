<?php

namespace App\Service;

use App\Entity\ProjectReference;
use App\Repository\ProjectReferenceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

final class ProjectReferenceRagService
{
    public function __construct(
        private EmbeddingService $embeddingService,
        private ProjectReferenceRepository $repository,
        private EntityManagerInterface $entityManager,
        private LoggerInterface $logger,
    ) {
    }

    public function buildEmbeddingText(ProjectReference $reference): string
    {
        $parts = [
            'Name: '.$reference->getName(),
            'Description: '.$reference->getDescription(),
        ];

        if ($reference->getIndustry() !== null) {
            $parts[] = 'Industry: '.$reference->getIndustry();
        }

        if ($reference->getBudgetMin() !== null && $reference->getBudgetMax() !== null) {
            $parts[] = 'Budget: $'.$reference->getBudgetMin().'-'.$reference->getBudgetMax();
        }

        if ($reference->getDurationMonths() !== null) {
            $parts[] = 'Duration: '.$reference->getDurationMonths().' months';
        }

        if ($reference->getTeamSize() !== null) {
            $parts[] = 'Team size: '.$reference->getTeamSize();
        }

        $tags = $reference->getTags();
        if (is_array($tags) && $tags !== []) {
            $parts[] = 'Tags: '.implode(', ', $tags);
        }

        return implode("\n", $parts);
    }

    public function embedAndStore(ProjectReference $reference): void
    {
        $embedding = $this->embeddingService->embed($this->buildEmbeddingText($reference));
        $this->storeEmbedding($reference->getId(), $embedding);
    }

    public function storeEmbedding(int $referenceId, array $embedding): void
    {
        $this->entityManager->getConnection()->executeStatement(
            'UPDATE project_reference SET embedding = :embedding::vector WHERE id = :id',
            [
                'embedding' => $this->formatVector($embedding),
                'id' => $referenceId,
            ]
        );
    }

    public function findSimilar(string $query, int $limit = 5): array
    {
        $embedding = $this->embeddingService->embed($query);

        return $this->repository->findSimilarByEmbedding($embedding, $limit);
    }

    public function embedReferenceSafely(ProjectReference $reference): void
    {
        try {
            $this->embedAndStore($reference);
        } catch (\Throwable $exception) {
            $this->logger->error('Failed to embed project reference', [
                'referenceId' => $reference->getId(),
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function formatVector(array $embedding): string
    {
        return '['.implode(',', array_map(
            static fn (float $value): string => rtrim(rtrim(sprintf('%.8F', $value), '0'), '.'),
            $embedding
        )).']';
    }
}
