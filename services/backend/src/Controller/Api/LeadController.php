<?php

namespace App\Controller\Api;

use App\Entity\Lead;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

final class LeadController extends AbstractController
{
    #[Route('/api/leads', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        HttpClientInterface $httpClient
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $lead = new Lead();
        $lead->setEmail($data['email'] ?? '');
        $lead->setCompany($data['company'] ?? null);
        $lead->setMessage($data['message'] ?? null);
        $lead->setStatus('new');

        try {
            $response = $httpClient->request(
                'POST',
                'http://ai-orchestrator:3000/analyze',
                [
                    'json' => [
                        'message' => $lead->getMessage(),
                    ],
                    'timeout' => 60,
                ]
            );

            $statusCode = $response->getStatusCode();

            if ($statusCode >= 400) {
                return $this->json([
                    'status' => 'error',
                    'message' => 'AI analysis failed',
                    'details' => $response->toArray(false),
                ], JsonResponse::HTTP_BAD_GATEWAY);
            }

            $aiData = $response->toArray();
        } catch (TransportExceptionInterface $e) {
            return $this->json([
                'status' => 'error',
                'message' => 'AI service unavailable',
            ], JsonResponse::HTTP_BAD_GATEWAY);
        }

        $lead->setAiIntent($aiData['intent'] ?? null);
        $lead->setAiComplexity($aiData['complexity'] ?? null);
        $lead->setAiEstimatedCost($aiData['estimatedCost'] ?? null);

        $em->persist($lead);
        $em->flush();

        return $this->json([
            'status' => 'created',
            'id' => $lead->getId(),
            'ai' => $aiData,
        ]);
    }
}
