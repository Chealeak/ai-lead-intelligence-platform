<?php

namespace App\Command;

use App\Repository\ProjectReferenceRepository;
use App\Service\ProjectReferenceRagService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:embed-project-references',
    description: 'Generate and store embeddings for all project references',
)]
final class EmbedProjectReferencesCommand extends Command
{
    public function __construct(
        private ProjectReferenceRepository $repository,
        private ProjectReferenceRagService $ragService,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $references = $this->repository->findBy([], ['id' => 'ASC']);

        if ($references === []) {
            $io->warning('No project references found.');

            return Command::SUCCESS;
        }

        $io->progressStart(count($references));

        foreach ($references as $reference) {
            $this->ragService->embedAndStore($reference);
            $io->progressAdvance();
        }

        $io->progressFinish();
        $io->success(sprintf('Embedded %d project reference(s).', count($references)));

        return Command::SUCCESS;
    }
}
