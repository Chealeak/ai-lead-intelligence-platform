<?php

namespace App\Controller\Api;

use App\Entity\Conversation;
use App\Repository\ConversationRepository;
use App\Service\ConversationManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ConversationController extends AbstractController
{
    #[Route('/api/conversations', methods: ['POST'])]
    public function create(Request $request, ConversationManager $conversationManager): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        $conversation = $conversationManager->create(
            isset($data['email']) ? (string) $data['email'] : null,
            isset($data['company']) ? (string) $data['company'] : null,
        );

        $welcomeMessage = $conversation->getMessages()->last();

        return $this->json(
            $this->buildResponse(
                $conversation,
                $conversationManager,
                [
                    'intent' => 'greeting',
                    'conversationState' => $conversation->getState(),
                    'missingInformation' => ['project_description'],
                    'nextAction' => 'ask_questions',
                    'assistantMessage' => $welcomeMessage ? $welcomeMessage->getContent() : '',
                    'estimatedCost' => null,
                    'complexity' => null,
                    'similarProjects' => [],
                    'suggestedActions' => [],
                    'proposalContent' => null,
                ]
            ),
            Response::HTTP_CREATED
        );
    }

    #[Route('/api/conversations/{id}', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(
        int $id,
        ConversationRepository $repository,
        ConversationManager $conversationManager,
    ): JsonResponse {
        $conversation = $repository->find($id);

        if (!$conversation) {
            return $this->json(['error' => 'Conversation not found'], Response::HTTP_NOT_FOUND);
        }

        return $this->json(
            $this->buildResponse(
                $conversation,
                $conversationManager,
                $this->extractLastAssistantMetadata($conversation)
            )
        );
    }

    #[Route('/api/conversations/{id}/messages', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function sendMessage(
        int $id,
        Request $request,
        ConversationRepository $repository,
        ConversationManager $conversationManager,
    ): JsonResponse {
        $conversation = $repository->find($id);

        if (!$conversation) {
            return $this->json(['error' => 'Conversation not found'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $message = trim((string) ($data['message'] ?? ''));

        if ($message === '') {
            return $this->json(['error' => 'message is required'], Response::HTTP_BAD_REQUEST);
        }

        if (!empty($data['email'])) {
            $conversation->setEmail((string) $data['email']);
        }

        if (!empty($data['company'])) {
            $conversation->setCompany((string) $data['company']);
        }

        try {
            $result = $conversationManager->handleMessage(
                $conversation,
                $message,
                isset($data['action']) ? (string) $data['action'] : null,
            );
        } catch (\RuntimeException $exception) {
            return $this->json(
                ['error' => $exception->getMessage()],
                Response::HTTP_BAD_GATEWAY
            );
        }

        return $this->json(
            $this->buildResponse(
                $result['conversation'],
                $conversationManager,
                $result['assistant'],
                $result['messages']
            )
        );
    }

    /**
     * @param array<string, mixed> $assistant
     * @param list<array<string, mixed>>|null $messages
     *
     * @return array<string, mixed>
     */
    private function buildResponse(
        Conversation $conversation,
        ConversationManager $conversationManager,
        array $assistant,
        ?array $messages = null,
    ): array {
        return [
            'conversationId' => $conversation->getId(),
            'state' => $conversation->getState(),
            'email' => $conversation->getEmail(),
            'company' => $conversation->getCompany(),
            'messages' => $messages ?? $conversationManager->serializeMessages($conversation),
            'assistant' => $assistant,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function extractLastAssistantMetadata(Conversation $conversation): array
    {
        $messages = $conversation->getMessages();

        for ($index = $messages->count() - 1; $index >= 0; --$index) {
            $message = $messages->get($index);

            if ($message && $message->getRole() === 'assistant' && is_array($message->getMetadata())) {
                return $message->getMetadata();
            }
        }

        return [
            'intent' => 'general_inquiry',
            'conversationState' => $conversation->getState(),
            'missingInformation' => [],
            'nextAction' => 'continue_conversation',
            'assistantMessage' => '',
            'estimatedCost' => null,
            'complexity' => null,
            'similarProjects' => [],
            'suggestedActions' => [],
            'proposalContent' => null,
        ];
    }
}
