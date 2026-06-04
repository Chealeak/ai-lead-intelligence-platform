<?php

namespace App\Entity;

use App\Repository\ProjectReferenceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProjectReferenceRepository::class)]
class ProjectReference
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT)]
    private ?string $description = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $industry = null;

    #[ORM\Column(nullable: true)]
    private ?int $budgetMin = null;

    #[ORM\Column(nullable: true)]
    private ?int $budgetMax = null;

    #[ORM\Column(nullable: true)]
    private ?int $durationMonths = null;

    #[ORM\Column(nullable: true)]
    private ?int $teamSize = null;

    #[ORM\Column(nullable: true)]
    private ?array $tags = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getIndustry(): ?string
    {
        return $this->industry;
    }

    public function setIndustry(?string $industry): static
    {
        $this->industry = $industry;

        return $this;
    }

    public function getBudgetMin(): ?int
    {
        return $this->budgetMin;
    }

    public function setBudgetMin(?int $budgetMin): static
    {
        $this->budgetMin = $budgetMin;

        return $this;
    }

    public function getBudgetMax(): ?int
    {
        return $this->budgetMax;
    }

    public function setBudgetMax(?int $budgetMax): static
    {
        $this->budgetMax = $budgetMax;

        return $this;
    }

    public function getDurationMonths(): ?int
    {
        return $this->durationMonths;
    }

    public function setDurationMonths(?int $durationMonths): static
    {
        $this->durationMonths = $durationMonths;

        return $this;
    }

    public function getTeamSize(): ?int
    {
        return $this->teamSize;
    }

    public function setTeamSize(?int $teamSize): static
    {
        $this->teamSize = $teamSize;

        return $this;
    }

    public function getTags(): ?array
    {
        return $this->tags;
    }

    public function setTags(?array $tags): static
    {
        $this->tags = $tags;

        return $this;
    }
}
