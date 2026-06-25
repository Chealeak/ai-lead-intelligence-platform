<?php

namespace App\Repository;

use App\Entity\ProjectReference;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ProjectReference>
 */
class ProjectReferenceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ProjectReference::class);
    }

    public function findSimilarByEmbedding(array $embedding, int $limit = 5): array
    {
        $vector = '['.implode(',', array_map(
            static fn (float $value): string => rtrim(rtrim(sprintf('%.8F', $value), '0'), '.'),
            $embedding
        )).']';

        $connection = $this->getEntityManager()->getConnection();
        $rows = $connection->fetchAllAssociative(
            'SELECT id
             FROM project_reference
             WHERE embedding IS NOT NULL
             ORDER BY embedding <=> :embedding::vector
             LIMIT :limit',
            [
                'embedding' => $vector,
                'limit' => $limit,
            ],
            [
                'limit' => \Doctrine\DBAL\ParameterType::INTEGER,
            ]
        );

        if ($rows === []) {
            return [];
        }

        $ids = array_map(static fn (array $row): int => (int) $row['id'], $rows);

        $references = $this->createQueryBuilder('p')
            ->andWhere('p.id IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()
            ->getResult();

        $indexed = [];
        foreach ($references as $reference) {
            $indexed[$reference->getId()] = $reference;
        }

        $ordered = [];
        foreach ($ids as $id) {
            if (isset($indexed[$id])) {
                $ordered[] = $indexed[$id];
            }
        }

        return $ordered;
    }
}
