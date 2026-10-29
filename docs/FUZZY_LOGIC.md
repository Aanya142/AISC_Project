# Mamdani Fuzzy Logic Inference Engine Deep Dive

This document provides a comprehensive technical and mathematical reference for the **Mamdani Fuzzy Logic Controller** implemented in `backend/app/controllers/fuzzy_controller.py`.

---

## 1. Why Mamdani Fuzzy Logic?

Traffic signal control is inherently subject to imprecision, non-linear arrival patterns, and qualitative trade-offs:
- Crisp threshold rules (e.g., `IF queue > 10 THEN green = 40`) cause **chattering and abrupt boundary transitions**, where minor fluctuations (e.g., 9 vs 10 vehicles) lead to drastically different signal behavior.
- Traditional mathematical optimization models (e.g., Webster's formula) rely on static arrival distributions and assume equilibrium conditions that do not exist during peak urban congestion.
- Deep Reinforcement Learning (DRL) often functions as an uninterpretable "black box," making certification and safety validation challenging for municipal traffic engineers.

**Mamdani Fuzzy Inference** bridges this gap:
1. **Linguistic Explainability**: Traffic engineers can read, audit, and calibrate human-understandable rules (e.g., *"IF density is HIGH and queue is LONG, THEN priority is HIGH"*).
2. **Smooth Non-Linear Surface**: Continuous membership functions eliminate abrupt phase switching.
3. **Multi-Criteria Arbitration**: Seamlessly balances competing demands between traffic volume, queue length, and individual vehicle waiting times.
4. **Mathematical Transparency**: Implemented entirely with fundamental NumPy operations without external opaque libraries.

---

## 2. Membership Function Mathematical Definitions

The controller uses two standard piecewise linear membership functions:

### Triangular Membership Function (`trimf`)
Defined by three parameters $[a, b, c]$ where $a \le b \le c$:

$$\mu_{\text{tri}}(x; a, b, c) = \begin{cases}
0, & x \le a \\
\frac{x - a}{b - a}, & a < x \le b \\
\frac{c - x}{c - b}, & b < x < c \\
0, & x \ge c
\end{cases}$$

### Trapezoidal Membership Function (`trapmf`)
Defined by four parameters $[a, b, c, d]$ where $a \le b \le c \le d$:

$$\mu_{\text{trap}}(x; a, b, c, d) = \begin{cases}
0, & x \le a \text{ or } x \ge d \\
\frac{x - a}{b - a}, & a < x < b \\
1, & b \le x \le c \\
\frac{d - x}{d - c}, & c < x < d
\end{cases}$$

---

## 3. Linguistic Input Variables & Parameters

The fuzzy controller evaluates three crisp real-world inputs sampled from vehicle approach kinematics:

| Variable Name | Symbol | Universe of Discourse | Linguistic Sets | Type | Parameter Vector $[a, b, c, (d)]$ |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Traffic Density** | $D$ | $0 \dots 35$ veh | **Low** | Trapezoidal | $[0.0, 0.0, 4.0, 10.0]$ |
| | | | **Medium** | Triangular | $[7.0, 15.0, 22.0]$ |
| | | | **High** | Trapezoidal | $[18.0, 25.0, 35.0, 40.0]$ |
| **Queue Length** | $Q$ | $0 \dots 25$ veh | **Short** | Trapezoidal | $[0.0, 0.0, 2.0, 6.0]$ |
| | | | **Medium** | Triangular | $[4.0, 10.0, 16.0]$ |
| | | | **Long** | Trapezoidal | $[12.0, 18.0, 25.0, 30.0]$ |
| **Average Wait Time** | $W$ | $0 \dots 80$ sec | **Short** | Trapezoidal | $[0.0, 0.0, 6.0, 16.0]$ |
| | | | **Moderate** | Triangular | $[12.0, 28.0, 44.0]$ |
| | | | **Long** | Trapezoidal | $[35.0, 50.0, 80.0, 100.0]$ |

*Input Clamping Bounds*:
- $D$ is clamped to $[0.0, 35.0]$
- $Q$ is clamped to $[0.0, 25.0]$
- $W$ is clamped to $[0.0, 80.0]$

---

## 4. Linguistic Output Variables & Universes

The controller produces two defuzzified continuous outputs:

### 1. Phase Priority Score ($P \in [0, 100]$)
Defuzzification universe: 201 discrete points between $0.0$ and $100.0$ ($\Delta y = 0.5$).

| Linguistic Set | Function Type | Parameters $[a, b, c, (d)]$ | Semantic Meaning |
| :--- | :---: | :--- | :--- |
| **Low** | Triangular | $[0.0, 15.0, 35.0]$ | Approach has sparse traffic, low urgency |
| **Medium** | Triangular | $[25.0, 50.0, 75.0]$ | Normal traffic volume, moderate delay |
| **High** | Triangular | $[65.0, 80.0, 95.0]$ | Substantial queue requiring prompt service |
| **Very High** | Trapezoidal | $[80.0, 92.0, 100.0, 100.0]$ | Severe congestion or starvation threshold exceeded |

### 2. Recommended Green Duration ($G \in [G_{\min}, G_{\max}]$)
Defuzzification universe: 151 discrete points between $G_{\min} = 10.0$\,s and $G_{\max} = 60.0$\,s.
Let $\text{span} = G_{\max} - G_{\min} = 50.0$, $g_{\text{low}} = 10.0$, $g_{\text{mid}} = 10 + 0.45(50) = 32.5$, $g_{\text{high}} = 60.0$:

| Linguistic Set | Function Type | Parameter Formula | Concrete Values ($G \in [10, 60]$) |
| :--- | :---: | :--- | :--- |
| **Short** | Trapezoidal | $[g_{\text{low}}-5, g_{\text{low}}, g_{\text{low}}+0.2\text{span}, g_{\text{mid}}]$ | $[5.0, 10.0, 20.0, 32.5]$ |
| **Medium** | Triangular | $[g_{\text{low}}+0.15\text{span}, g_{\text{mid}}, g_{\text{high}}-0.1\text{span}]$ | $[17.5, 32.5, 55.0]$ |
| **Long** | Trapezoidal | $[g_{\text{mid}}, g_{\text{high}}-0.2\text{span}, g_{\text{high}}, g_{\text{high}}+5]$ | $[32.5, 50.0, 60.0, 65.0]$ |

---

## 5. Complete 13-Rule Inference Base

The knowledge base consists of 13 expert heuristic rules. Conjunction (AND) is evaluated using the Gödel t-norm (**Min operator**):

$$\alpha_k = \min(\mu_{A_k}(x_1), \mu_{B_k}(x_2), \dots)$$

| Rule ID | Condition (Antecedents) | Consequent Priority | Consequent Green | Engineering Rationale |
| :---: | :--- | :---: | :---: | :--- |
| **R1** | Density is `HIGH` AND Wait is `LONG` | `VERY_HIGH` | `LONG` | Heavy corridor with accumulated delay; maximum service needed |
| **R2** | Density is `HIGH` AND Queue is `LONG` | `HIGH` | `LONG` | Large physical queue; requires long green to clear shockwave |
| **R3** | Density is `LOW` AND Wait is `SHORT` | `LOW` | `SHORT` | Sparse traffic; minimize green to return right-of-way quickly |
| **R4** | Wait is `LONG` *(Unconditional)* | `VERY_HIGH` | `MEDIUM` | **Anti-Starvation**: Prevents isolated cars from waiting indefinitely |
| **R5** | Density is `MEDIUM` AND Wait is `MODERATE` | `MEDIUM` | `MEDIUM` | Typical steady-state conditions; standard split allocation |
| **R6** | Queue is `LONG` AND Density is `MEDIUM` | `HIGH` | `MEDIUM` | Standing queue needing discharge before arrival surge |
| **R7** | Wait is `MODERATE` AND Queue is `LONG` | `HIGH` | `LONG` | Significant queue that has been waiting; needs full cycle flush |
| **R8** | Density is `LOW` AND Queue is `SHORT` | `LOW` | `SHORT` | Minimal presence; allocate shortest safe green time |
| **R9** | Density is `HIGH` AND Queue is `MEDIUM` | `HIGH` | `MEDIUM` | Steady flow approaching; grant sufficient green to avoid stoppage |
| **R10** | Density is `MEDIUM` AND Queue is `SHORT` | `MEDIUM` | `SHORT` | Moderate arrivals but no queue backlog; short phase is sufficient |
| **R11** | Queue is `LONG` AND Wait is `SHORT` | `HIGH` | `MEDIUM` | Sudden surge just arrived; give high priority to clear queue fast |
| **R12** | Queue is `SHORT` AND Wait is `MODERATE` | `MEDIUM` | `SHORT` | Few cars but moderate wait; quick green to clear without delay |
| **R13** | Density is `MEDIUM` AND Queue is `MEDIUM` | `MEDIUM` | `MEDIUM` | Balanced moderate demand; allocate standard mid-range green |

---

## 6. Mathematical Step-by-Step Inference Process

The execution pipeline follows 5 distinct mathematical stages:

```
[ Crisp Inputs: D, Q, W ]
            |
            v
   (1) FUZZIFICATION
   Compute membership degrees: mu_D(d), mu_Q(q), mu_W(w)
            |
            v
   (2) RULE FIRING STRENGTH EVALUATION
   Compute alpha_k = min(mu_inputs) for each rule k in 1..13
            |
            v
   (3) MAMDANI IMPLICATION (MIN-CLIPPING)
   mu_out_k(y) = min(alpha_k, mu_consequent(y))
            |
            v
   (4) MAX AGGREGATION
   mu_agg(y) = max_{k}(mu_out_k(y)) across all fired rules
            |
            v
   (5) CENTROID DEFUZZIFICATION
   y* = sum(y * mu_agg(y)) / sum(mu_agg(y))
            |
            v
[ Crisp Outputs: Priority Score (0-100), Green Time (10-60s) ]
```

### Stage 1: Fuzzification
Convert scalar inputs $d, q, w$ into membership vectors:
$$\boldsymbol{\mu}_D = \{\mu_{\text{low}}(d), \mu_{\text{med}}(d), \mu_{\text{high}}(d)\}$$
$$\boldsymbol{\mu}_Q = \{\mu_{\text{short}}(q), \mu_{\text{med}}(q), \mu_{\text{long}}(q)\}$$
$$\boldsymbol{\mu}_W = \{\mu_{\text{short}}(w), \mu_{\text{mod}}(w), \mu_{\text{long}}(w)\}$$

### Stage 2: Rule Firing Evaluation
For each rule $k \in \{1 \dots 13\}$, calculate firing strength $\alpha_k$:
- Example for R1: $\alpha_1 = \min(\mu_{D,\text{high}}(d), \mu_{W,\text{long}}(w))$
- If $\alpha_k < 0.001$, the rule is pruned from active calculation.

### Stage 3: Mamdani Min-Clipping Implication
The consequent fuzzy set $\mu_{\text{cons}}(y)$ is clipped at level $\alpha_k$:
$$\mu_{\text{rule}, k}(y) = \min\big(\alpha_k, \, \mu_{\text{cons}}(y)\big), \quad \forall y \in Y$$

### Stage 4: Max Aggregation
Combine individual clipped fuzzy sets using the standard t-conorm (**Max operator**):
$$\mu_{\text{agg}}(y) = \max_{k=1 \dots 13} \big(\mu_{\text{rule}, k}(y)\big), \quad \forall y \in Y$$

### Stage 5: Centroid Defuzzification (Center of Gravity)
The defuzzified crisp output $y^*$ is calculated over the discrete universe $Y$:
$$y^* = \frac{\sum_{i=1}^{N} y_i \cdot \mu_{\text{agg}}(y_i)}{\sum_{i=1}^{N} \mu_{\text{agg}}(y_i)}$$

*Default Fallback*: If $\sum \mu_{\text{agg}}(y_i) < 10^{-6}$ (no rule fired), the system defaults to $P = 30.0$ and $G = (G_{\min} + G_{\max}) / 2 = 35.0$\,s.

---

## 7. Numerical Walkthrough Example

Let us trace an explicit numerical calculation through the engine:

### Given Input Scenario:
- **Approach Density**: $D = 21.0$ vehicles
- **Queue Length**: $Q = 14.0$ vehicles
- **Average Waiting Time**: $W = 38.0$ seconds

---

### Step 1: Fuzzification Calculations

#### 1. Density ($D = 21.0$):
- $\mu_{\text{low}}(21.0) = \text{trapmf}(21.0, 0, 0, 4, 10) = 0.0$
- $\mu_{\text{med}}(21.0) = \text{trimf}(21.0, 7, 15, 22) = \frac{22 - 21}{22 - 15} = \frac{1}{7} \approx \mathbf{0.1429}$
- $\mu_{\text{high}}(21.0) = \text{trapmf}(21.0, 18, 25, 35, 40) = \frac{21 - 18}{25 - 18} = \frac{3}{7} \approx \mathbf{0.4286}$

#### 2. Queue Length ($Q = 14.0$):
- $\mu_{\text{short}}(14.0) = \text{trapmf}(14.0, 0, 0, 2, 6) = 0.0$
- $\mu_{\text{med}}(14.0) = \text{trimf}(14.0, 4, 10, 16) = \frac{16 - 14}{16 - 10} = \frac{2}{6} \approx \mathbf{0.3333}$
- $\mu_{\text{long}}(14.0) = \text{trapmf}(14.0, 12, 18, 25, 30) = \frac{14 - 12}{18 - 12} = \frac{2}{6} \approx \mathbf{0.3333}$

#### 3. Waiting Time ($W = 38.0$):
- $\mu_{\text{short}}(38.0) = \text{trapmf}(38.0, 0, 0, 6, 16) = 0.0$
- $\mu_{\text{mod}}(38.0) = \text{trimf}(38.0, 12, 28, 44) = \frac{44 - 38}{44 - 28} = \frac{6}{16} = \mathbf{0.3750}$
- $\mu_{\text{long}}(38.0) = \text{trapmf}(38.0, 35, 50, 80, 100) = \frac{38 - 35}{50 - 35} = \frac{3}{15} = \mathbf{0.2000}$

---

### Step 2: Rule Firing Strengths ($\alpha_k$)

Evaluating the 13 rules with non-zero inputs:
- **R1** ($\text{High } D \ \& \ \text{Long } W$): $\min(0.4286, 0.2000) = \mathbf{0.2000} \implies P=\text{Very High}, G=\text{Long}$
- **R2** ($\text{High } D \ \& \ \text{Long } Q$): $\min(0.4286, 0.3333) = \mathbf{0.3333} \implies P=\text{High}, G=\text{Long}$
- **R4** ($\text{Long } W$): $0.2000 \implies P=\text{Very High}, G=\text{Medium}$
- **R5** ($\text{Med } D \ \& \ \text{Mod } W$): $\min(0.1429, 0.3750) = \mathbf{0.1429} \implies P=\text{Medium}, G=\text{Medium}$
- **R6** ($\text{Long } Q \ \& \ \text{Med } D$): $\min(0.3333, 0.1429) = \mathbf{0.1429} \implies P=\text{High}, G=\text{Medium}$
- **R7** ($\text{Mod } W \ \& \ \text{Long } Q$): $\min(0.3750, 0.3333) = \mathbf{0.3333} \implies P=\text{High}, G=\text{Long}$
- **R9** ($\text{High } D \ \& \ \text{Med } Q$): $\min(0.4286, 0.3333) = \mathbf{0.3333} \implies P=\text{High}, G=\text{Medium}$
- **R13** ($\text{Med } D \ \& \ \text{Med } Q$): $\min(0.1429, 0.3333) = \mathbf{0.1429} \implies P=\text{Medium}, G=\text{Medium}$

*(Rules R3, R8, R10, R11, R12 produce $\alpha = 0.0$ because one antecedent is zero).*

---

### Step 3: Aggregation & Defuzzification

1. **Priority Output Sets**:
   - `Medium` clipped at $\max(0.1429, 0.1429) = 0.1429$
   - `High` clipped at $\max(0.3333, 0.1429, 0.3333, 0.3333) = 0.3333$
   - `Very High` clipped at $\max(0.2000, 0.2000) = 0.2000$
   - Computing Centroid:
     $$\text{Priority}^* \approx \mathbf{76.4} \quad (\text{High Priority Urgency})$$

2. **Green Duration Output Sets**:
   - `Medium` clipped at $\max(0.2000, 0.1429, 0.1429, 0.3333, 0.1429) = 0.3333$
   - `Long` clipped at $\max(0.2000, 0.3333, 0.3333) = 0.3333$
   - Computing Centroid:
     $$\text{Green}^* \approx \mathbf{44.2}\text{ seconds}$$

The resulting recommendation is **$44.2$\,s green** with an urgency of **$76.4/100$**.

---

## 8. Starvation Prevention Mechanisms

To guarantee that minor side approaches are never starved by high-volume arterial corridors, the controller implements a two-fold mitigation strategy:

1. **Rule Base Anti-Starvation (Rule 4)**:
   ```python
   # Rule 4: IF waiting time is LONG -> increase priority to VERY_HIGH
   add_rule("R4", "wait LONG (Starvation mitigation)",
            mu_w["long"],
            "very_high", "medium")
   ```
   Because Rule 4 is independent of density and queue, an isolated vehicle that has waited over 35 seconds automatically activates high firing strength into `VERY_HIGH` priority.

2. **Heuristic Phase Starvation Override**:
   In `decide_phase()` (`fuzzy_controller.py`, lines 290–294):
   ```python
   if ns_metrics.get("wait_time", 0.0) > 45.0:
       p_ns = min(100.0, p_ns + 15.0)
   if ew_metrics.get("wait_time", 0.0) > 45.0:
       p_ew = min(100.0, p_ew + 15.0)
   ```
   If average wait exceeds 45 seconds, the approach receives an unconditional **$+15.0$ priority bonus**, guaranteeing that arterial green phases are terminated to yield right-of-way.

---

## 9. Controller Limitations

1. **Approach Aggregation**: In the 4-way intersection model, North and South metrics are averaged into a single corridor score $NS$, and East and West into $EW$. Asymmetric one-way surges (e.g., North heavy, South empty) are smoothed out by the averaging step.
2. **Fixed Parameter Bounds**: The membership parameters $[a, b, c, d]$ were designed via domain heuristics rather than calibrated through multi-sensor real-world field surveys.
3. **No Platoon Recognition**: The fuzzy inputs count standing queues and average delays, but do not yet model incoming high-speed vehicle platoons detected upstream.
