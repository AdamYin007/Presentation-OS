# Academic Lecture: Quantum Computing — From Qubits to Algorithms

## Introduction

Quantum computing represents a paradigm shift in computational power, leveraging quantum mechanical phenomena to solve problems intractable for classical computers. This lecture covers fundamental concepts, key algorithms, and current research frontiers.

## Classical vs Quantum Computation

| Aspect | Classical | Quantum |
|--------|-----------|---------|
| Basic unit | Bit (0 or 1) | Qubit (superposition) |
| Processing | Sequential/parallel | Superposition + entanglement |
| Complexity class | P, NP | BQP |
| Error correction | Redundancy | Quantum codes (surface code) |

### The Qubit

A qubit exists in state:

$$|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$$

where $\alpha, \beta \in \mathbb{C}$ and $|\alpha|^2 + |\beta|^2 = 1$.

Measurement collapses the superposition to either $|0\rangle$ with probability $|\alpha|^2$ or $|1\rangle$ with probability $|\beta|^2$.

## Key Quantum Algorithms

### Shor's Algorithm (1994)

- **Purpose**: Integer factorization
- **Complexity**: $O((\log N)^3)$ vs classical $O(e^{(\log N)^{1/3}})$
- **Impact**: Breaks RSA encryption with sufficient qubits
- **Requirements**: ~20 million physical qubits for 2048-bit RSA

### Grover's Algorithm (1996)

- **Purpose**: Unstructured search
- **Speedup**: Quadratic ($O(\sqrt{N})$ vs $O(N)$)
- **Applications**: Database search, cryptographic brute force
- **Qubit requirement**: Modest; works on near-term devices

### Quantum Approximate Optimization (QAOA)

- **Purpose**: Combinatorial optimization
- **Approach**: Variational hybrid quantum-classical
- **Use cases**: Portfolio optimization, routing problems
- **Current status**: Demonstrated on 53-qubit Sycamore processor

## Quantum Hardware Approaches

1. **Superconducting circuits** (IBM, Google)
   - Fast gate operations (~10-100 ns)
   - Scalable fabrication
   - Requires millikelvin temperatures

2. **Trapped ions** (IonQ, Quantinuum)
   - High fidelity gates (>99.9%)
   - Long coherence times
   - Slower gate speeds

3. **Photonic** (Xanadu, PsiQuantum)
   - Room temperature operation
   - Natural communication medium
   - Challenges in deterministic two-qubit gates

4. **Topological** (Microsoft)
   - Inherent error protection
   - Theoretical fault tolerance
   - Experimental challenges remain

## Current State of the Art

- **IBM Condor**: 1,121 qubits (2023)
- **Google Sycamore**: 70+ qubits with demonstrated quantum advantage
- **IonQ Forte**: 64 high-fidelity qubits
- **Error rates**: Physical gate errors 0.01-0.1%, logical errors still too high

## Research Frontiers

### Quantum Error Correction

Surface codes require ~1,000 physical qubits per logical qubit. Recent breakthroughs:

- Demonstrated distance-3 surface code (Nature, 2023)
- Logical qubit lifetime exceeds physical qubit coherence
- Path toward fault-tolerant universal quantum computation

### Quantum Machine Learning

Hybrid approaches combining quantum and classical neural networks:

- Variational quantum eigensolvers for molecular simulation
- Quantum kernel methods for classification
- Potential exponential speedup in feature space mapping

## Conclusion

Quantum computing is transitioning from theoretical physics to engineering reality. While universal fault-tolerant quantum computers remain years away, near-term NISQ devices already demonstrate practical value in optimization and simulation tasks. Continued investment in hardware, algorithms, and error correction will determine the timeline to quantum advantage across industries.
