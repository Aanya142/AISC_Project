"""
Tests for Genetic Algorithm Timing Plan Optimization.
Validates chromosome structure, genetic operators, reproducibility, and fitness evaluation.
"""

import pytest
import asyncio
from app.schemas.models import GAConfig, TrafficScenario
from app.optimization.genetic_algorithm import GeneticAlgorithmOptimizer
from app.optimization.fitness import WorkloadFitnessEvaluator


def test_chromosome_initialization():
    config = GAConfig(population_size=20, generations=5)
    ga = GeneticAlgorithmOptimizer(config, min_green=10.0, max_green=60.0)
    ga.init_population()

    assert len(ga.population) == 20
    for chrom in ga.population:
        assert len(chrom) == 4
        for gene in chrom:
            assert 10.0 <= gene <= 60.0


def test_tournament_selection():
    config = GAConfig(population_size=10, generations=2)
    ga = GeneticAlgorithmOptimizer(config)
    ga.population = [
        [15.0, 15.0, 15.0, 15.0],
        [30.0, 30.0, 30.0, 30.0],
        [45.0, 45.0, 45.0, 45.0],
    ]
    ga.fitnesses = [10.0, 50.0, 80.0]

    # Out of candidates, highest fitness should be chosen if sampled
    winner = ga.tournament_selection(k=3)
    assert winner == [45.0, 45.0, 45.0, 45.0]


def test_crossover_and_mutation():
    config = GAConfig(population_size=10, crossover_rate=1.0, mutation_rate=0.5)
    ga = GeneticAlgorithmOptimizer(config, min_green=10.0, max_green=60.0)

    p1 = [20.0, 20.0, 20.0, 20.0]
    p2 = [40.0, 40.0, 40.0, 40.0]

    c1, c2 = ga.crossover(p1, p2)
    assert len(c1) == 4
    assert len(c2) == 4
    for gene in c1 + c2:
        assert 10.0 <= gene <= 60.0

    mut = ga.mutate(c1)
    assert len(mut) == 4
    for gene in mut:
        assert 10.0 <= gene <= 60.0


def test_fitness_reproducibility():
    evaluator1 = WorkloadFitnessEvaluator(scenario=TrafficScenario.BALANCED, fixed_seed=42)
    evaluator2 = WorkloadFitnessEvaluator(scenario=TrafficScenario.BALANCED, fixed_seed=42)

    chrom = [25.0, 25.0, 25.0, 25.0]
    fit1, m1 = evaluator1.evaluate(chrom)
    fit2, m2 = evaluator2.evaluate(chrom)

    assert fit1 == fit2
    assert m1["avg_wait"] == m2["avg_wait"]
    assert m1["throughput"] == m2["throughput"]


@pytest.mark.asyncio
async def test_ga_async_execution():
    config = GAConfig(population_size=10, generations=3, scenario=TrafficScenario.BALANCED)
    ga = GeneticAlgorithmOptimizer(config, min_green=10.0, max_green=60.0)

    result = await ga.run_async()

    assert result.is_running is False
    assert result.progress == 1.0
    assert len(result.history) == 3
    assert result.best_chromosome is not None
    assert len(result.best_chromosome) == 4
    assert "green_ns" in result.optimized_timing
    assert "green_ew" in result.optimized_timing
    assert result.optimized_timing["green_ns"] >= 10.0
    assert result.optimized_timing["green_ew"] >= 10.0
