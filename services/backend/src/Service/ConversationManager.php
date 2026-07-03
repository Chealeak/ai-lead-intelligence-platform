<?php

namespace App\Service;

use App\Entity\Conversation;
use App\Entity\ConversationMessage;
use App\Entity\Lead;
use Doctrine\ORM\EntityManagerInterface;

final class ConversationManager
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private ConversationAiService $conversationAiService,
        private ProposalService $proposalService,
    ) {
    }

    public function create(?string $email = null, ?string $company = null): Conversation
    {
        $conversation = new Conversation();
        $conversation->setEmail($email);
        $conversation->setCompany($company);
        $conversation->setState('WAITING_REQUIREMENTS');

        $welcome = new ConversationMessage();
        $welcome->setRole('assistant');
        $welcome->setContent(
            'Hi! I\'m your AI sales assistant. Tell me about the project you want to build and I\'ll help estimate scope, timeline, and cost.'
        );
        $conversation->addMessage($welcome);

        $this->entityManager->persist($conversation);
        $this->entityManager->flush();

        return $conversation;
    }

    /**
     * @return array{
     *     conversation: Conversation,
     *     assistant: array<string, mixed>,
     *     messages: list<array<string, mixed>>
     * }
     */
    public function handleMessage(Conversation $conversation, string $message, ?string $action = null): array
    {
        $userMessage = new ConversationMessage();
        $userMessage->setRole('user');
        $userMessage->setContent($message);
        $conversation->addMessage($userMessage);

        $this->entityManager->flush();

        $history = $this->buildHistory($conversation, excludeLatest: true);
        $assistant = $this->conversationAiService->chat($conversation, $message, $history, $action);

        $assistant = $this->applyBusinessActions($conversation, $assistant);

        $assistantMessage = new ConversationMessage();
        $assistantMessage->setRole('assistant');
        $assistantMessage->setContent((string) $assistant['assistantMessage']);
        $assistantMessage->setMetadata($assistant);
        $conversation->addMessage($assistantMessage);

        $conversation->setState((string) $assistant['conversationState']);
        $this->syncLead($conversation, $assistant);

        $this->entityManager->flush();

        return [
            'conversation' => $conversation,
            'assistant' => $assistant,
            'messages' => $this->serializeMessages($conversation),
        ];
    }

    /**
     * @return list<array{role: string, content: string}>
     */
    private function buildHistory(Conversation $conversation, bool $excludeLatest = false): array
    {
        $messages = $conversation->getMessages()->toArray();

        if ($excludeLatest && $messages !== []) {
            array_pop($messages);
        }

        return array_map(
            static fn (ConversationMessage $message): array => [
                'role' => (string) $message->getRole(),
                'content' => (string) $message->getContent(),
            ],
            $messages
        );
    }

    /**
     * @param array<string, mixed> $assistant
     *
     * @return array<string, mixed>
     */
    private function applyBusinessActions(Conversation $conversation, array $assistant): array
    {
        $nextAction = (string) ($assistant['nextAction'] ?? '');

        if ($nextAction === 'generate_proposal') {
            $proposalContent = $assistant['proposalContent'] ?? null;

            if (!is_array($proposalContent) || $proposalContent === []) {
                $assistant['nextAction'] = 'ask_questions';
                $assistant['conversationState'] = 'PROPOSAL_REQUESTED';
                $assistant['assistantMessage'] =
                    'I need a bit more detail before generating your proposal. Could you confirm the main goals and timeline?';

                return $assistant;
            }

            if (!$conversation->getEmail()) {
                $assistant['nextAction'] = 'ask_questions';
                $assistant['conversationState'] = 'PROPOSAL_REQUESTED';
                $assistant['missingInformation'] = array_values(array_unique(array_merge(
                    $assistant['missingInformation'] ?? [],
                    ['email']
                )));
                $assistant['assistantMessage'] =
                    'I can prepare your PDF proposal. What email address should I send it to?';

                return $assistant;
            }

            $result = $this->proposalService->generateAndSend(
                $conversation,
                $proposalContent,
                $conversation->getLead()
            );

            $assistant['conversationState'] = 'COMPLETED';
            $assistant['nextAction'] = 'continue_conversation';
            $assistant['assistantMessage'] = $result['assistantMessage'];
            $assistant['suggestedActions'] = [
                ['label' => 'Book a Meeting', 'action' => 'request_meeting'],
            ];
        }

        if ($nextAction === 'handoff_to_sales' && $conversation->getLead()) {
            $conversation->getLead()->setStatus('handoff');
        }

        return $assistant;
    }

    /**
     * @param array<string, mixed> $assistant
     */
    private function syncLead(Conversation $conversation, array $assistant): void
    {
        if (!$conversation->getEmail()) {
            return;
        }

        $lead = $conversation->getLead();

        if (!$lead) {
            $lead = new Lead();
            $lead->setEmail((string) $conversation->getEmail());
            $lead->setCompany($conversation->getCompany());
            $lead->setStatus('conversation');
            $conversation->setLead($lead);
            $this->entityManager->persist($lead);
        }

        $lead->setMessage($this->buildLeadSummary($conversation));
        $lead->setAiIntent($assistant['intent'] ?? null);
        $lead->setAiComplexity(isset($assistant['complexity']) ? (string) $assistant['complexity'] : null);
        $lead->setAiEstimatedCost(isset($assistant['estimatedCost']) ? (string) $assistant['estimatedCost'] : null);
    }

    private function buildLeadSummary(Conversation $conversation): string
    {
        $parts = [];

        foreach ($conversation->getMessages() as $message) {
            if ($message->getRole() === 'user') {
                $parts[] = (string) $message->getContent();
            }
        }

        return implode("\n", $parts);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function serializeMessages(Conversation $conversation): array
    {
        $result = [];

        foreach ($conversation->getMessages() as $message) {
            $result[] = [
                'role' => $message->getRole(),
                'content' => $message->getContent(),
                'createdAt' => $message->getCreatedAt()?->format(DATE_ATOM),
                'metadata' => $message->getMetadata(),
            ];
        }

        return $result;
    }
}
