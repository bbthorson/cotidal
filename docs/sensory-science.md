---
summary: The maths behind a pour — rating normalisation for satiety and meal timing, the 5D Extended Kalman Filter (state, covariance, predict/update, the hedonic measurement function) — and the background it rests on.
read_when: Changing palate-state.ts, predictHedonic, the filter's constants, or what a pour's rating does to the state.
---

# Sensory science

Code: `src/lib/palate/palate-state.ts`. The map's x/y move by `applyPour`'s
simpler capped rule; the filter learns the other three axes. Nothing here is
calibrated against real ratings yet.

## The plane

Two user-facing axes, a projection of a richer sensory space (valence,
structure and tactile intensity, retronasal complexity):

- $x \in [-10, 10]$: Rich ↔ Crisp (structure, tactile)
- $y \in [-10, 10]$: Savory ↔ Sweet (valence)

## Ratings

- **9-point hedonic scale** for liking; **gLMS** (quasi-logarithmic, topped
  by "strongest imaginable sensation of any kind") for intensities, which
  avoids the recalibration that Likert scales invite.
- **CATA** (check all that apply) records what was detected without valence,
  kept apart from liking, which blunts aspirational reporting ("I like it
  bitter"). Giving CATA or intensities lowers the measurement noise $R$.
- Astringency is tactile (tannins precipitating salivary proteins), and
  carbonation's bite is acid-sensing (TRPA1, PKD2L1): mouthfeel is not
  flavour, which is why tannin tolerance is its own axis.

## Normalising a rating

Both inputs stay on the device (`PourContext`), never in a record.

**Sensory-specific satiety.** Liking decays with volume, sweetness faster
($\lambda = 0.002\ \text{mL}^{-1}$ for a sweet drink, $0.0008$ otherwise):
$$H_{\text{norm}} = (H_{\text{raw}} - 5) \cdot e^{\lambda (V - 150)} + 5$$

**Meal timing** (sweet drinks only): ghrelin amplifies sweet reward when
fasting, so after 3.5 hours or more the deviation from 5 is scaled by $0.88$;
within an hour of eating, by $1.12$.

## The Extended Kalman Filter

State $\mathbf{x}_k = [x_{\text{crisp}}, y_{\text{sweet}}, \theta_{\text{bitter}}, \theta_{\text{tannin}}, \theta_{\text{complexity}}]^T$,
the tolerances in $[0, 10]$, in the order of `latentVector` in
`app.cotidal.palate.json`.

- $\mathbf{P}_0 = \operatorname{diag}(25, 25, 16, 16, 16)$ (a confident quiz
  starts smaller, from `UserProfile.variance`)
- $\mathbf{Q} = \operatorname{diag}(0.02, 0.02, 0.01, 0.01, 0.01)$

**Predict:** $\hat{\mathbf{x}}_{k|k-1} = \hat{\mathbf{x}}_{k-1}$,
$\mathbf{P}_{k|k-1} = \mathbf{P}_{k-1} + \mathbf{Q}$.

**Measurement** $h$ predicts a 1–9 rating from map distance $d$, less a
penalty per tolerance the drink exceeds:
$$h(\mathbf{x}) = 1 + 8 \cdot \operatorname{clamp}_{[0,1]}\!\left(1 - \tfrac{d}{28.28} - p_{\text{bitter}} - p_{\text{tannin}} - p_{\text{complexity}}\right)$$

- $p_{\text{bitter}} = 0.25 (5 - \theta_{\text{bitter}})/5$ for a bitter drink when $\theta_{\text{bitter}} < 5$
- $p_{\text{tannin}} = 0.2 (4 - \theta_{\text{tannin}})/4$ for a smoky drink when $\theta_{\text{tannin}} < 4$
- $p_{\text{complexity}} = 0.2 (c - \theta_{\text{complexity}})/c$ when $\theta_{\text{complexity}} < c$, with demand $c = 2.5 + 2.5n$ for $n$ of its smoke, anise and bitter flags (`complexityDemand`)

An axis $h$ doesn't read has a zero Jacobian entry and never learns, so each
tolerance has a penalty term.

**Update** with $\tilde{y}_k = z_k - h(\hat{\mathbf{x}}_{k|k-1})$,
$\mathbf{H}_k = \partial h / \partial \mathbf{x}$,
$S_k = \mathbf{H}_k \mathbf{P}_{k|k-1} \mathbf{H}_k^T + R_k$,
$\mathbf{K}_k = \mathbf{P}_{k|k-1} \mathbf{H}_k^T S_k^{-1}$,
$\hat{\mathbf{x}}_k = \hat{\mathbf{x}}_{k|k-1} + \mathbf{K}_k \tilde{y}_k$,
and the Joseph form, which keeps $\mathbf{P}$ symmetric positive
semi-definite:
$$\mathbf{P}_k = (\mathbf{I} - \mathbf{K}_k \mathbf{H}_k) \mathbf{P}_{k|k-1} (\mathbf{I} - \mathbf{K}_k \mathbf{H}_k)^T + \mathbf{K}_k R_k \mathbf{K}_k^T$$

## Not applied

**Stevens' power law** ($\Psi = k I^n$; sucrose $n \approx 1.3$–$1.5$, bitter
and acid $n \approx 1$) maps concentration to perceived intensity, and
nothing in the app carries a concentration. Its place is deriving a drink's
position from the `stimulus` fields in `app.cotidal.defs.json` once they are
populated, not the filter. Convert pH to acid concentration first, and expect
single-compound exponents to overstate a mixture.
