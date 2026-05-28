<?php

namespace App\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class LeadController extends AbstractController
{
    #[Route('/api/leads', methods: ['GET'])]
    public function index(): JsonResponse
    {
        return $this->json([
            'status' => 'ok'
        ]);
    }
}
