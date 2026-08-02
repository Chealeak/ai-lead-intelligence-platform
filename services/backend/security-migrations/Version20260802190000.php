<?php

declare(strict_types=1);

namespace DoctrineMigrations\Security;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260802190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add opaque UUIDv4 public identifiers to conversations';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE conversation ADD public_id VARCHAR(36) DEFAULT NULL');
        $this->addSql('UPDATE conversation SET public_id = gen_random_uuid()::text');
        $this->addSql('ALTER TABLE conversation ALTER public_id SET NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8A8E26E962B5A6A ON conversation (public_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX UNIQ_8A8E26E962B5A6A');
        $this->addSql('ALTER TABLE conversation DROP public_id');
    }
}
