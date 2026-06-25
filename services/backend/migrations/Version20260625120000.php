<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260625120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Enable pgvector and add embedding column to project_reference';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE EXTENSION IF NOT EXISTS vector');
        $this->addSql('ALTER TABLE project_reference ADD embedding vector(1536) DEFAULT NULL');
        $this->addSql('CREATE INDEX project_reference_embedding_idx ON project_reference USING hnsw (embedding vector_cosine_ops)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX project_reference_embedding_idx');
        $this->addSql('ALTER TABLE project_reference DROP embedding');
        $this->addSql('DROP EXTENSION IF EXISTS vector');
    }
}
