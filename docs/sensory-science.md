# Sensory Science and Psychophysical Preference Modeling

The scientific foundation, chemosensory mechanics, and recursive state mathematics underlying The Crystal Coupe's preference engine.

---

## 1. Latent Dimensionality & Psychophysical Anchors

Human flavor preferences for complex liquid matrices—including cocktails, fine wine, specialty coffee, and craft spirits—are dynamic, non-stationary systems. They are subject to physiological habituation, cognitive chunking, and neuroendocrine shifts.

### 1.1 Trilinear Orthogonal Sensory Space
To model taste evolution mathematically, physical beverage stimuli are mapped via External Preference Mapping (EPM), Generalized Procrustes Analysis (GPA), and Parallel Factor Analysis (PARAFAC) onto three primary orthogonal axes:

1. **Valence & Hedonic Resonance**: The primary driver of acceptance, governed by the balance of sweet-sour modalities and the suppression or integration of bitterness.
2. **Structural & Tactile Intensity**: Rheological and somatosensory mouthfeel properties: viscosity, carbonation effervescence, astringency, and ethanol thermal irritation.
3. **Retronasal Volatile Complexity**: Volatile Organic Compound (VOC) profiles categorized by olfactory receptors (esters, terpenes, aldehydes, phenols), moving from broad flavor categories to discrete molecular descriptors.

The Crystal Coupe projects this space onto a two-dimensional user-facing coordinate system:
- **$x \in [-10, 10]$**: Rich ($-10$) $\longleftrightarrow$ Crisp ($+10$) (Structural / Tactile axis)
- **$y \in [-10, 10]$**: Savory ($-10$) $\longleftrightarrow$ Sweet ($+10$) (Valence axis)

---

## 2. Receptor Mechanics & Somatosensation

Accurate psychophysical tracking requires separating **retronasal volatile categorization** (flavor) from **trigeminal and tactile stimuli** (mouthfeel).

### 2.1 Astringency: PRP Precipitation & Aquaporin-1/5 Inhibition
Astringency is fundamentally tactile, not gustatory:
- **Salivary Lubrication Breakdown**: Dietary polyphenols (such as wood tannins from oak-aged spirits or fortified wines) bind non-covalently to salivary proline-rich proteins (PRPs). This causes protein aggregation and precipitation, degrading the oral mucosal pellicle. The resulting increase in mechanical friction across the tongue is detected by mechanoreceptors.
- **Transepithelial Water Flux Inhibition**: Polyphenolic tannins actively inhibit **Aquaporin-1 (AQP1)** and **Aquaporin-5 (AQP5)** water channels in the lingual epithelium and salivary glands. This rapid inhibition halts cellular water secretion, generating the physical sensation of oral mucosal puckering and dryness.

### 2.2 Thermal Pungency (TRPV1) & Carbonation Bite (TRPA1 / PKD2L1)
- **TRPV1 (Transient Receptor Potential Vanilloid 1)**: Nociceptive cation channels triggered by heat, capsaicin, and high proof (>20% ABV ethanol). Sensitization and desensitization curves vary by individual trigeminal tolerance.
- **Carbonic Anhydrase IV**: Dissolved $\text{CO}_2$ in highballs and sparkling wines is catalyzed by extracellular Carbonic Anhydrase IV into bicarbonate ions and free protons ($\text{H}^+$). These protons activate **TRPA1** channels and **PKD2L1** sour-sensing cells, producing the tactile crispness and "bite" of carbonation.

### 2.3 The generalized Labeled Magnitude Scale (gLMS)
To evaluate subjective intensity without falling into the **El Greco Fallacy** (where individuals with physiological differences subconsciously recalibrate traditional Likert scales), evaluations are anchored to the **generalized Labeled Magnitude Scale (gLMS)**:
- Quasi-logarithmic spacing between anchors.
- Bounded at the top by a modality-general anchor: *"Strongest imaginable sensation of any kind"* (e.g. looking directly into the sun).
- Enables cross-modal calibration of genetic taste markers, such as **TAS2R38** bitter receptor expression density.

---

## 3. Expertise Acquisition & Mixture Suppression

### 3.1 Stevens' Power Law & Sweet Masking
The psychophysical transition from a novice palate to an expert is governed by cognitive chunking and mixture suppression:
$$\Psi(I) = k \cdot I^n$$
- For sucrose, the exponent is **expansive** ($n \approx 1.3 - 1.5$), meaning perceived sweetness grows faster than physical concentration.
- For bitter compounds (e.g., gentian, quinine) and acids (citric, malic), the exponent is **linear or compressive** ($n \approx 1.0$).

In untrained palates, sweetness centrally suppresses bitterness and sourness. Novices rely on sugar to mask astringency and ethanol burn. As expertise develops through exposure and cognitive chunking, consumers learn to analytically isolate molecular descriptors, acquiring hedonic affinity for unmasked bitters, high acidity, and tannic structures.

### 3.2 Mitigating the Self-Report Paradox
Consumers frequently suffer from aspirational bias—claiming to prefer dry, bitter, or challenging drinks to signal sophistication. The Crystal Coupe bypasses this paradox by strictly decoupling:
1. **Objective Identification**: Captured via **Check-All-That-Apply (CATA)** arrays (binary verification of detected volatile notes without valence attachment).
2. **Subjective Valuation**: Captured via continuous **gLMS** hedonic and intensity scales.

---

## 4. Transitory State Normalization

Real-world ratings are inherently noisy due to transient biological and circadian factors:

### 4.1 Sensory-Specific Satiety (SSS)
Pleasantness degrades exponentially as volume consumed increases, independent of caloric load. Sweetness satiates significantly faster ($\lambda_{\text{sweet}} \approx 0.002 \text{ mL}^{-1}$) than structural astringency ($\lambda_{\text{tannin}} \approx 0.0008 \text{ mL}^{-1}$):
$$H_{\text{norm}} = (H_{\text{raw}} - 5) \cdot \exp\left( \lambda \cdot (V_{\text{consumed}} - 150) \right) + 5$$
Normalizing for volume consumed recovers the drinker's true underlying hedonic valence.

### 4.2 Prandial Ghrelin & Circadian Fluctuations
Ghrelin, the orexigenic peptide released during fasting, amplifies both the perceived intensity and the reward value of sweet and fatty matrices. Pours logged in a prolonged fasting state (>3.5 hours) receive an attenuation factor ($0.88$), while postprandial logs (<1 hour) receive a compensatory boost ($1.12$). This prevents post-dinner satiety from masquerading as permanent palate drift.

---

## 5. Dynamic State Modeling: The Extended Kalman Filter

To track longitudinal preference evolution across decentralized repositories, The Crystal Coupe implements an **Extended Kalman Filter (EKF)**.

### 5.1 Latent State Vector $\mathbf{x}_k \in \mathbb{R}^5$
$$\mathbf{x}_k = \begin{bmatrix} 
x_{\text{crisp}} \\ 
y_{\text{sweet}} \\ 
\theta_{\text{bitter}} \\ 
\theta_{\text{tannin}} \\ 
\theta_{\text{complexity}} 
\end{bmatrix}$$

- $x_{\text{crisp}} \in [-10, 10]$: Rich vs. Crisp structural balance.
- $y_{\text{sweet}} \in [-10, 10]$: Savory vs. Sweet valence balance.
- $\theta_{\text{bitter}} \in [0, 10]$: Learned bitter tolerance (TAS2R38).
- $\theta_{\text{tannin}} \in [0, 10]$: Astringency / Aquaporin inhibition tolerance.
- $\theta_{\text{complexity}} \in [0, 10]$: Volatile discrimination & cognitive chunking.

### 5.2 Error Covariance Matrix $\mathbf{P}_k \in \mathbb{R}^{5 \times 5}$
$\mathbf{P}_k$ represents the system's multidimensional uncertainty and cross-axis correlations.
- Initial prior: $\mathbf{P}_0 = \operatorname{diag}([25.0, 25.0, 16.0, 16.0, 16.0])$.
- Background process noise: $\mathbf{Q} = \operatorname{diag}([0.02, 0.02, 0.01, 0.01, 0.01])$.

### 5.3 Filter Equations

**1. Predict Step**:
$$\mathbf{\hat{x}}_{k|k-1} = \mathbf{\hat{x}}_{k-1|k-1}$$
$$\mathbf{P}_{k|k-1} = \mathbf{P}_{k-1|k-1} + \mathbf{Q}$$

**2. Measurement Residual & Jacobian**:
$$\tilde{y}_k = z_k - h(\mathbf{\hat{x}}_{k|k-1}; \text{stimulus})$$
$$\mathbf{H}_k = \left. \frac{\partial h}{\partial \mathbf{x}} \right|_{\mathbf{\hat{x}}_{k|k-1}}$$

**3. Kalman Gain**:
$$S_k = \mathbf{H}_k \mathbf{P}_{k|k-1} \mathbf{H}_k^T + R_k$$
$$\mathbf{K}_k = \mathbf{P}_{k|k-1} \mathbf{H}_k^T S_k^{-1}$$

**4. Joseph-Form Covariance Update**:
$$\mathbf{\hat{x}}_{k|k} = \mathbf{\hat{x}}_{k|k-1} + \mathbf{K}_k \tilde{y}_k$$
$$\mathbf{P}_{k|k} = (\mathbf{I} - \mathbf{K}_k \mathbf{H}_k) \mathbf{P}_{k|k-1} (\mathbf{I} - \mathbf{K}_k \mathbf{H}_k)^T + \mathbf{K}_k R_k \mathbf{K}_k^T$$

The Joseph form guarantees that $\mathbf{P}_k$ remains strictly positive semi-definite and symmetric throughout infinite sequential updates, preventing numerical divergence.

As tasting events accumulate, $\operatorname{Tr}(\mathbf{P}_k)$ converges toward 0, providing a verifiable metric of palate maturity and algorithmic confidence.
