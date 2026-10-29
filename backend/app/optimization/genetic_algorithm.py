"""
Genetic Algorithm Optimizer for Traffic Signal Timing Optimization.
Implements tournament selection, blend crossover, Gaussian mutation, elitism,
and progress tracking for asynchronous execution.
"""

import asyncio
import random
from typing import List, Tuple, Dict, Any, Optional, Callable
import numpy as np

from ..schemas.models import GAConfig, GAResult, GenerationStat, TrafficScenario
from .fitness import WorkloadFitnessEvaluator


class GeneticAlgorithmOptimizer:
    def __init__(
        self,
        config: GAConfig,
        min_green: float = 10.0,
        max_green: float = 60.0,
        yellow: float = 3.0,
        all_red: float = 2.0,
    ):
        self.config = config
        self.min_green = min_green
        self.max_green = max_green
        self.yellow = yellow
        self.all_red = all_red

        self.evaluator = WorkloadFitnessEvaluator(
            scenario=config.scenario,
            duration_seconds=180.0,
            fixed_seed=42,
            min_green=min_green,
            max_green=max_green,
            yellow=yellow,
            all_red=all_red,
        )

        self.population: List[List[float]] = []
        self.fitnesses: List[float] = []
        self.best_chromosome: Optional[List[float]] = None
        self.best_fitness: float = -1.0
        self.history: List[GenerationStat] = []

        self.is_running = False
        self.progress = 0.0

    def init_population(self):
        """Initializes population of random chromosomes [g_N, g_S, g_E, g_W]."""
        self.population = []
        for _ in range(self.config.population_size):
            chrom = [
                random.uniform(self.min_green, self.max_green)
                for _ in range(4)
            ]
            self.population.append(chrom)

    def tournament_selection(self, k: int = 3) -> List[float]:
        """Selects the fittest candidate out of k random choices."""
        indices = random.sample(range(len(self.population)), k)
        best_idx = max(indices, key=lambda idx: self.fitnesses[idx])
        return list(self.population[best_idx])

    def crossover(self, parent1: List[float], parent2: List[float]) -> Tuple[List[float], List[float]]:
        """Blend crossover with probability crossover_rate."""
        if random.random() > self.config.crossover_rate:
            return list(parent1), list(parent2)

        alpha = 0.5
        c1, c2 = [], []
        for g1, g2 in zip(parent1, parent2):
            val1 = alpha * g1 + (1.0 - alpha) * g2
            val2 = (1.0 - alpha) * g1 + alpha * g2
            # Bounded clamping
            c1.append(max(self.min_green, min(self.max_green, val1)))
            c2.append(max(self.min_green, min(self.max_green, val2)))
        return c1, c2

    def mutate(self, chromosome: List[float]) -> List[float]:
        """Gaussian mutation with probability mutation_rate per gene."""
        mutated = []
        for gene in chromosome:
            if random.random() < self.config.mutation_rate:
                noise = random.gauss(0.0, 5.0)
                new_gene = max(self.min_green, min(self.max_green, gene + noise))
                mutated.append(new_gene)
            else:
                mutated.append(gene)
        return mutated

    async def run_async(
        self, progress_callback: Optional[Callable[[GAResult], None]] = None
    ) -> GAResult:
        """
        Runs the full GA asynchronously with generation-by-generation progress updates.
        """
        self.is_running = True
        self.history = []
        self.init_population()

        total_gens = self.config.generations

        for gen in range(1, total_gens + 1):
            # 1. Evaluate fitness for all chromosomes
            self.fitnesses = []
            for chrom in self.population:
                fit, _ = self.evaluator.evaluate(chrom)
                self.fitnesses.append(fit)

            # 2. Track stats
            gen_best_idx = int(np.argmax(self.fitnesses))
            gen_best_fit = float(self.fitnesses[gen_best_idx])
            gen_avg_fit = float(np.mean(self.fitnesses))
            gen_best_chrom = [round(v, 2) for v in self.population[gen_best_idx]]

            if gen_best_fit > self.best_fitness:
                self.best_fitness = gen_best_fit
                self.best_chromosome = list(gen_best_chrom)

            stat = GenerationStat(
                generation=gen,
                best_fitness=round(gen_best_fit, 3),
                avg_fitness=round(gen_avg_fit, 3),
                best_chromosome=gen_best_chrom,
            )
            self.history.append(stat)

            self.progress = round(gen / total_gens, 2)

            # Yield control so other tasks / API calls run smoothly
            await asyncio.sleep(0.02)

            # 3. Create next generation with elitism (preserve top 2)
            sorted_indices = np.argsort(self.fitnesses)[::-1]
            next_pop = [
                list(self.population[sorted_indices[0]]),
                list(self.population[sorted_indices[1]]),
            ]

            while len(next_pop) < self.config.population_size:
                p1 = self.tournament_selection()
                p2 = self.tournament_selection()
                c1, c2 = self.crossover(p1, p2)
                next_pop.append(self.mutate(c1))
                if len(next_pop) < self.config.population_size:
                    next_pop.append(self.mutate(c2))

            self.population = next_pop

        self.is_running = False
        self.progress = 1.0

        # Construct final optimal timing plan
        g_n, g_s, g_e, g_w = self.best_chromosome
        opt_ns = round(max(g_n, g_s), 1)
        opt_ew = round(max(g_e, g_w), 1)
        cycle_len = round(opt_ns + opt_ew + 2 * (self.yellow + self.all_red), 1)

        result = GAResult(
            is_running=False,
            progress=1.0,
            current_generation=total_gens,
            total_generations=total_gens,
            best_fitness=round(self.best_fitness, 3),
            avg_fitness=round(float(np.mean(self.fitnesses)), 3),
            history=self.history,
            best_chromosome=self.best_chromosome,
            optimized_timing={
                "green_ns": opt_ns,
                "green_ew": opt_ew,
                "cycle_length": cycle_len,
            },
            applied=False,
            scenario=self.config.scenario.value,
        )

        if progress_callback:
            progress_callback(result)

        return result
