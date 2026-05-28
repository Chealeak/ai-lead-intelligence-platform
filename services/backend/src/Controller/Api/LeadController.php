<?php

namespace App\Controller\Api;

use App\Entity\Lead;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

final class LeadController extends AbstractController
{
    #[Route('/api/leads', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
    
        $lead = new Lead();
        $lead->setEmail($data['email'] ?? '');
        $lead->setCompany($data['company'] ?? null);
        $lead->setMessage($data['message'] ?? null);
        $lead->setStatus('new');
    
        $em->persist($lead);
        $em->flush();
    
        return $this->json([
            'status' => 'created',
            'id' => $lead->getId(),
        ]);
    }
}
