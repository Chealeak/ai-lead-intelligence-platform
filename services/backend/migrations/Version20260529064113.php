<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260529064113 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE lead ADD ai_intent VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE lead ADD ai_complexity VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE lead ADD ai_estimated_cost VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE lead DROP ai_intent');
        $this->addSql('ALTER TABLE lead DROP ai_complexity');
        $this->addSql('ALTER TABLE lead DROP ai_estimated_cost');
    }
}
