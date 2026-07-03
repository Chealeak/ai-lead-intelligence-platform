<?php

namespace App\Service;

use App\Entity\Conversation;
use App\Entity\Lead;
use App\Entity\Proposal;
use Doctrine\ORM\EntityManagerInterface;
use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

final class ProposalService
{
    public function __construct(
        private EntityManagerInterface $entityManager,
        private MailerInterface $mailer,
        #[Autowire('%kernel.project_dir%')]
        private string $projectDir,
        #[Autowire('%env(default:mailer_from_default:MAILER_FROM)%')]
        private string $mailerFrom,
    ) {
    }

    /**
     * @param array<string, mixed> $proposalContent
     *
     * @return array{proposal: Proposal, assistantMessage: string}
     */
    public function generateAndSend(
        Conversation $conversation,
        array $proposalContent,
        ?Lead $lead = null,
    ): array {
        $pdfPath = $this->generatePdf($conversation, $proposalContent);

        $proposal = new Proposal();
        $proposal->setConversation($conversation);
        $proposal->setLead($lead);
        $proposal->setContent($proposalContent);
        $proposal->setPdfPath($pdfPath);
        $proposal->setStatus('generated');

        $this->entityManager->persist($proposal);
        $this->entityManager->flush();

        $emailSent = false;
        $email = $conversation->getEmail();

        if ($email) {
            $this->sendProposalEmail($email, $proposalContent, $pdfPath);
            $proposal->setStatus('sent');
            $this->entityManager->flush();
            $emailSent = true;
        }

        $assistantMessage = $emailSent
            ? 'Your proposal has been generated and sent to '.$email.'. Our team will follow up shortly.'
            : 'Your proposal has been generated. Please share your email address so we can send it to you.';

        return [
            'proposal' => $proposal,
            'assistantMessage' => $assistantMessage,
        ];
    }

    /**
     * @param array<string, mixed> $content
     */
    private function generatePdf(Conversation $conversation, array $content): string
    {
        $directory = $this->projectDir.'/var/proposals';
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new \RuntimeException('Unable to create proposal directory');
        }

        $filename = sprintf('proposal-%d-%s.pdf', $conversation->getId(), date('YmdHis'));
        $absolutePath = $directory.'/'.$filename;

        $html = $this->renderHtml($content, $conversation);

        $options = new Options();
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4');
        $dompdf->render();
        file_put_contents($absolutePath, $dompdf->output());

        return 'var/proposals/'.$filename;
    }

    /**
     * @param array<string, mixed> $content
     */
    private function renderHtml(array $content, Conversation $conversation): string
    {
        $scope = $this->renderList($content['scope'] ?? []);
        $deliverables = $this->renderList($content['deliverables'] ?? []);
        $assumptions = $this->renderList($content['assumptions'] ?? []);

        $title = htmlspecialchars((string) ($content['title'] ?? 'Project Proposal'), ENT_QUOTES);
        $summary = nl2br(htmlspecialchars((string) ($content['summary'] ?? ''), ENT_QUOTES));
        $timeline = htmlspecialchars((string) ($content['timeline'] ?? 'TBD'), ENT_QUOTES);
        $investment = htmlspecialchars((string) ($content['investment'] ?? 'TBD'), ENT_QUOTES);
        $company = htmlspecialchars((string) ($conversation->getCompany() ?? ''), ENT_QUOTES);

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #111827; line-height: 1.5; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        h2 { font-size: 16px; margin-top: 24px; }
        .meta { color: #6b7280; margin-bottom: 24px; }
        ul { padding-left: 18px; }
    </style>
</head>
<body>
    <h1>{$title}</h1>
    <div class="meta">Prepared for {$company}</div>
    <p>{$summary}</p>
    <h2>Scope</h2>
    {$scope}
    <h2>Deliverables</h2>
    {$deliverables}
    <h2>Timeline</h2>
    <p>{$timeline}</p>
    <h2>Investment</h2>
    <p>{$investment}</p>
    <h2>Assumptions</h2>
    {$assumptions}
</body>
</html>
HTML;
    }

    /**
     * @param list<string>|mixed $items
     */
    private function renderList(mixed $items): string
    {
        if (!is_array($items) || $items === []) {
            return '<p>Not specified</p>';
        }

        $listItems = array_map(
            static fn ($item): string => '<li>'.htmlspecialchars((string) $item, ENT_QUOTES).'</li>',
            $items
        );

        return '<ul>'.implode('', $listItems).'</ul>';
    }

    /**
     * @param array<string, mixed> $content
     */
    private function sendProposalEmail(string $recipient, array $content, string $relativePdfPath): void
    {
        $absolutePath = $this->projectDir.'/'.$relativePdfPath;
        $title = (string) ($content['title'] ?? 'Project Proposal');

        $email = (new Email())
            ->from($this->mailerFrom)
            ->to($recipient)
            ->subject($title)
            ->text('Please find your project proposal attached.')
            ->attachFromPath($absolutePath, 'proposal.pdf', 'application/pdf');

        $this->mailer->send($email);
    }
}
