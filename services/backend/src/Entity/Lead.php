<?php

namespace App\Entity;

use App\Repository\LeadRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LeadRepository::class)]
class Lead
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $email = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $company = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $message = null;

    #[ORM\Column(length: 50)]
    private ?string $status = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $aiIntent = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $aiComplexity = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $aiEstimatedCost = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getCompany(): ?string
    {
        return $this->company;
    }

    public function setCompany(?string $company): static
    {
        $this->company = $company;

        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(?string $message): static
    {
        $this->message = $message;

        return $this;
    }

    public function getStatus(): ?string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getAiIntent(): ?string
    {
        return $this->aiIntent;
    }

    public function setAiIntent(?string $aiIntent): static
    {
        $this->aiIntent = $aiIntent;

        return $this;
    }

    public function getAiComplexity(): ?string
    {
        return $this->aiComplexity;
    }

    public function setAiComplexity(?string $aiComplexity): static
    {
        $this->aiComplexity = $aiComplexity;

        return $this;
    }

    public function getAiEstimatedCost(): ?string
    {
        return $this->aiEstimatedCost;
    }

    public function setAiEstimatedCost(?string $aiEstimatedCost): static
    {
        $this->aiEstimatedCost = $aiEstimatedCost;

        return $this;
    }
}
