<?php

namespace App\Controller\Api;

use App\Entity\ProjectReference;
use App\Repository\ProjectReferenceRepository;
use App\Service\ProjectReferenceRagService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ProjectReferenceController extends AbstractController
{
    #[Route('/api/project-references', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        ProjectReferenceRagService $ragService,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['name']) || empty($data['description'])) {
            return $this->json(
                ['error' => 'name and description are required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $reference = new ProjectReference();
        $reference->setName($data['name']);
        $reference->setDescription($data['description']);
        $reference->setIndustry($data['industry'] ?? null);
        $reference->setBudgetMin(isset($data['budgetMin']) ? (int) $data['budgetMin'] : null);
        $reference->setBudgetMax(isset($data['budgetMax']) ? (int) $data['budgetMax'] : null);
        $reference->setDurationMonths(isset($data['durationMonths']) ? (int) $data['durationMonths'] : null);
        $reference->setTeamSize(isset($data['teamSize']) ? (int) $data['teamSize'] : null);
        $reference->setTags($data['tags'] ?? null);

        $em->persist($reference);
        $em->flush();

        $ragService->embedReferenceSafely($reference);

        return $this->json(
            $this->serialize($reference),
            Response::HTTP_CREATED
        );
    }

    #[Route('/api/project-references/search', methods: ['POST'])]
    public function search(Request $request, ProjectReferenceRagService $ragService): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $query = trim((string) ($data['query'] ?? ''));

        if ($query === '') {
            return $this->json(
                ['error' => 'query is required'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $limit = isset($data['limit']) ? max(1, min(20, (int) $data['limit'])) : 5;

        try {
            $references = $ragService->findSimilar($query, $limit);
        } catch (\RuntimeException $exception) {
            return $this->json(
                ['error' => $exception->getMessage()],
                Response::HTTP_BAD_GATEWAY
            );
        }

        return $this->json(array_map(
            fn (ProjectReference $reference) => $this->serialize($reference),
            $references
        ));
    }

    #[Route('/api/project-references', methods: ['GET'])]
    public function index(ProjectReferenceRepository $repository): JsonResponse
    {
        $references = $repository->findBy([], ['id' => 'ASC']);

        return $this->json(array_map(
            fn (ProjectReference $reference) => $this->serialize($reference),
            $references
        ));
    }

    #[Route('/api/project-references/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id, ProjectReferenceRepository $repository): JsonResponse
    {
        $reference = $repository->find($id);

        if (!$reference) {
            return $this->json(
                ['error' => 'Project reference not found'],
                Response::HTTP_NOT_FOUND
            );
        }

        return $this->json($this->serialize($reference));
    }

    private function serialize(ProjectReference $reference): array
    {
        return [
            'id' => $reference->getId(),
            'name' => $reference->getName(),
            'description' => $reference->getDescription(),
            'industry' => $reference->getIndustry(),
            'budgetMin' => $reference->getBudgetMin(),
            'budgetMax' => $reference->getBudgetMax(),
            'durationMonths' => $reference->getDurationMonths(),
            'teamSize' => $reference->getTeamSize(),
            'tags' => $reference->getTags(),
        ];
    }
}
