# Genetic Algorithm Optimizer Deep Dive

This document details the algorithmic structure, chromosome representation, genetic operators, deterministic fitness evaluation, and mathematical formulation of the **Genetic Algorithm (GA) Optimizer** implemented in `backend/app/optimization/genetic_algorithm.py` and `backend/app/optimization/fitness.py`.

---

## 1. Why Genetic Algorithm for Traffic Signal Optimization?

While the Mamdani Fuzzy Controller acts as a **tactical, real-time micro-controller** (deciding second-by-second when to extend or cut a green phase), it requires reasonable baseline green bounds. If an intersection faces a 4:1 traffic imbalance (e.g., peak morning commute), operating with default 30s/30s baselines forces the fuzzy controller to constantly fight against an unsuitable baseline timing plan.

The **Genetic Algorithm** acts as a **strategic planning layer**:
1. **Global Non-Convex Search**: Traffic flow dynamics involve non-linear queue formation and saturation discharge curves that contain multiple local optima where gradient-based methods fail.
2. **Multi-Objective Synthesis**: Simultaneously minimizes average delay, worst-case delay, and queue length while maximizing overall intersection throughput.
3. **Scenario-Tailored Timing Plans**: Generates near-optimal baseline green allocations $(G^*_{NS}, G^*_{EW})$ customized to specific demand distributions (e.g., Balanced, Heavy North-South, High Congestion).

---

## 2. Chromosome Representation & Encoding

The optimization space is parameterized as a real-valued chromosome containing 4 genes representing directional green allocations:

$$\mathbf{C} = \big[ g_N, \, g_S, \, g_E, \, g_W \big]$$

where each gene $g_i$ represents the target green duration in seconds for approach $i \in \{\text{North}, \text{South}, \text{East}, \text{West}\}$:

$$g_i \in [G_{\min}, G_{\max}] = [10.0, 60.0] \text{ seconds}$$

### Phase Mapping:
Because North and South share the corridor right-of-way, and East and West share the opposing corridor, the directional genes map to the 2 green phases of the intersection:

$$G_{NS} = \max(g_N, g_S)$$
$$G_{EW} = \max(g_E, g_W)$$

### Total Cycle Time ($C$):
Including yellow change intervals ($T_{\text{yellow}} = 3.0$\,s) and all-red clearance intervals ($T_{\text{all\_red}} = 2.0$\,s):

$$C = G_{NS} + G_{EW} + 2 \cdot (T_{\text{yellow}} + T_{\text{all\_red}}) = G_{NS} + G_{EW} + 10.0 \text{ seconds}$$

---

## 3. GA Hyperparameters & Operators

The genetic search uses standard parameters tuned for rapid convergence and execution stability:

| Hyperparameter | Symbol | Value | Description |
| :--- | :---: | :---: | :--- |
| **Population Size** | $N$ | **30** | Number of candidate timing plans per generation |
| **Generations** | $T$ | **20** | Iterations of natural selection and reproduction |
| **Tournament Size** | $k$ | **3** | Number of random candidates sampled during selection |
| **Crossover Rate** | $p_c$ | **0.80** | Probability of performing blend crossover ($80\%$) |
| **Blend Parameter** | $\alpha$ | **0.50** | Exploration parameter for Blend Crossover (BLX-$\alpha$) |
| **Mutation Rate** | $p_m$ | **0.15** | Probability of mutating an individual gene ($15\%$) |
| **Gaussian Mutation $\sigma$** | $\sigma$ | **5.0\,s** | Standard deviation of Gaussian perturbation noise |
| **Elitism Count** | $E$ | **2** | Top 2 best chromosomes preserved directly |

---

### Selection: Tournament Selection ($k=3$)
To select a parent for mating:
1. Sample $k = 3$ random chromosome indices with uniform probability from the current population.
2. Compare their evaluated fitness scores.
3. Return the candidate with the highest fitness:
$$P^* = \arg\max_{i \in \{r_1, r_2, r_3\}} \big( \text{Fitness}(\mathbf{C}_i) \big)$$

*Advantage*: Tournament selection provides tunable selection pressure without requiring costly global fitness scaling or risk of premature convergence seen in roulette-wheel selection.

---

### Crossover: Blend Crossover (BLX-$\alpha$, $\alpha=0.5$)
If a random uniform variable $U(0, 1) \le p_c$ ($0.80$), parent vectors $\mathbf{P}_1$ and $\mathbf{P}_2$ produce two offspring $\mathbf{C}_1$ and $\mathbf{C}_2$:

For each gene $j \in \{1, 2, 3, 4\}$:
$$c_{1, j} = \alpha \cdot p_{1, j} + (1.0 - \alpha) \cdot p_{2, j}$$
$$c_{2, j} = (1.0 - \alpha) \cdot p_{1, j} + \alpha \cdot p_{2, j}$$

With $\alpha = 0.50$, both offspring initially compute the midpoint average:
$$c_{1, j} = c_{2, j} = 0.5 \cdot (p_{1, j} + p_{2, j})$$

Each gene is then strictly clamped to ensure boundary feasibility:
$$c_{i, j} = \max\big(G_{\min}, \, \min(G_{\max}, \, c_{i, j})\big)$$

---

### Mutation: Bounded Gaussian Perturbation
For each gene $j$ of each offspring:
With probability $p_m = 0.15$, add zero-mean Gaussian noise with $\sigma = 5.0$\,s:

$$g_j' = \begin{cases}
\max\big(G_{\min}, \min(G_{\max}, g_j + \mathcal{N}(0, 5.0^2))\big), & \text{if } U(0, 1) < p_m \\
g_j, & \text{otherwise}
\end{cases}$$

*Advantage*: Real-valued Gaussian noise allows fine-tuning green splits by a few seconds without destroying overall chromosome structure.

---

### Elitism Strategy
To prevent regression where the best discovered solution is lost due to crossover or mutation:
1. At the conclusion of generation $t$, sort all 30 individuals by fitness in descending order.
2. Directly copy the top 2 fittest individuals ($E = 2$) into generation $t+1$.
3. Fill the remaining 28 slots through tournament selection, crossover, and mutation.

---

## 4. Deterministic Workload Fitness Evaluator

To evaluate the quality of a chromosome, the algorithm simulates the candidate timing plan on a deterministic microscopic traffic simulation:

- **Duration**: $180.0$ seconds ($3$ minutes of simulated traffic).
- **Time Step**: $\Delta t = 0.5$ seconds ($360$ simulation steps).
- **Fixed Random Seed**: `seed = 42`.
  - Using a fixed pseudo-random number generator guarantees that **all 30 chromosomes in all 20 generations face the exact same vehicle arrival sequences**.
  - This eliminates stochastic evaluation noise, making fitness comparisons mathematically fair and reproducible.

### Saturation Flow & Queuing Physics:
- Arrivals follow a Poisson process with rate $\lambda_d$ (vehicles/min):
  $$P(\text{arrival in } \Delta t) = 1 - \exp\left(-\frac{\lambda_d}{60} \cdot \Delta t\right)$$
- Discharge during green follows a saturation flow rate of $S = 0.55$ veh/second ($\approx 1980$ vehicles/hour/lane).
- Vehicle waiting time is modeled by queuing delay:
  $$W_{\text{veh}} = \min\big(120.0, \, Q_d \cdot 3.5 + 4.0\big) \text{ seconds}$$

---

## 5. Multi-Objective Cost & Fitness Formula

The evaluation calculates four key operational metrics over the 180s horizon:
1. $W_{\text{avg}}$: Average delay per vehicle (seconds).
2. $W_{\max}$: Maximum delay experienced by any vehicle (seconds).
3. $Q_{\text{avg}}$: Average queue length across all approaches (vehicles).
4. $\text{Throughput}$: Vehicles discharged per minute ($veh/min$).

### Starvation Discrepancy Penalty:
If a candidate timing plan allocates a green ratio that severely departs from the physical demand ratio, an asymmetric penalty is assessed:

$$\text{Demand Ratio} = \frac{\lambda_N + \lambda_S}{\max(1.0, \lambda_E + \lambda_W)}$$
$$\text{Actual Ratio} = \frac{G_{NS}}{\max(1.0, G_{EW})}$$
$$\text{Starvation Penalty} = 15.0 \times \left| \ln \left( \max\left(0.1, \, \frac{\text{Actual Ratio}}{\text{Demand Ratio}}\right) \right) \right|$$

*Explanation*: If East-West represents $80\%$ of traffic, but the chromosome allocates $80\%$ of green to North-South, the ratio discrepancy blows up the logarithm, heavily penalizing the candidate.

---

### Composite Cost Function ($J$):
The overall performance index combines delays, queues, throughput, and penalties:

$$J = 1.2 \cdot W_{\text{avg}} + 0.6 \cdot W_{\max} + 1.5 \cdot Q_{\text{avg}} - 0.4 \cdot \text{Throughput} + \text{Starvation Penalty}$$

### Fitness Transformation:
Because Genetic Algorithms maximize fitness, the cost $J$ is inverted into a bounded positive score:

$$\text{Fitness} = \frac{1000.0}{1.0 + \max(1.0, J)}$$

### Why this mapping?
1. **Higher is Better**: Minimizing cost $J$ directly maximizes $\text{Fitness}$.
2. **Strictly Positive & Non-Zero**: The $+1.0$ denominator prevents division by zero.
3. **Smooth Gradient**: As cost drops from $100 \to 50 \to 20 \to 10$, fitness smoothly climbs from $\approx 9.9 \to 19.6 \to 47.6 \to 90.9$.

---

## 6. Asynchronous Execution Architecture

In standard web applications, running 20 generations of 30 population members ($30 \times 20 = 600$ simulations) synchronously would block the server thread for several seconds, freezing the UI.

The optimizer is engineered with asynchronous yielding:
```python
# From backend/app/optimization/genetic_algorithm.py
for gen in range(1, total_gens + 1):
    # 1. Evaluate fitness for all chromosomes
    # 2. Track stats (best fitness, avg fitness, best chromosome)
    self.progress = round(gen / total_gens, 2)

    # Yield control to event loop so HTTP endpoints respond smoothly
    await asyncio.sleep(0.02)

    # 3. Create next generation with elitism & operators
```
- Dispatched as an `asyncio.Task` in the background.
- Clients poll `GET /api/optimization/status` to animate the progress bar in real time.
- Clients retrieve the full history via `GET /api/optimization/result` once complete.

---

## 7. Limitations of the GA Formulation

1. **Fixed Scenario Target**: The GA optimizes for a static scenario profile (e.g., Heavy North-South). If traffic patterns shift drastically during the day, the timing plan must be re-optimized or adapted dynamically by the Fuzzy layer.
2. **Simplified Simulator**: The workload fitness evaluator uses macroscopic queuing approximations ($dt=0.5$\,s) rather than full microscopic vehicle rendering to evaluate 600 candidate plans in under 2 seconds.
3. **Discrete Phase Split**: The optimizer tunes $G_{NS}$ and $G_{EW}$ for a 2-phase cycle, rather than variable multi-phase lead-lag left turns.
