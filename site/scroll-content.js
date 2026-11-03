/* Paper-based definitions and interpretation; equations use the shared notation renderer. */
(function (root) {
  'use strict';
  const inline=expression=>PaperNotation.inline(expression);
  const display=expression=>PaperNotation.tex(expression,true);
  const write=(id,html)=>{document.getElementById(id).innerHTML=html;};
  const input=String.raw`\cusvector{\inpvars}`;
  const theta=String.raw`\cusvector{\manifoldparameters}`;
  const parameters=String.raw`${theta}_{\boiteration,${input}}`;
  const jacobian=String.raw`\cusmatrix{\jacobianmap}_{\boiteration}(${input})`;
  const metric=String.raw`\fishermetric_{\manifold}(${parameters})`;
  const tensor=String.raw`\cusmatrix{\pullbackFIM}_{\boiteration}(${input})`;
  const factor=String.raw`\cusmatrix{\fisherjacobian}`;
  const direction=String.raw`\cusvector{\fisheracqgradient}`;
  const companion=String.raw`\cusmatrix{\fishercompanion}`;
  /** Define symbols at their first use and connect the displayed numerical examples. */
  function populate(){
    write('trace-legend-label',`Trace of pullback tensor ${inline(String.raw`\mathrm{tr}(${tensor})`)}`);
    write('hd-heading',`Why RAASP works and ${inline(String.raw`\sqrt{D}`)} scaling is the optimal scaling`);
    write('geometry-introduction',`At BO iteration ${inline(String.raw`\boiteration`)}, the surrogate maps input ${inline(input)} to a predictive state ${inline(String.raw`${parameters}=(\distmean,\distcov)`)} on the statistical manifold. The acquisition ${inline(String.raw`\acqf(${input})`)} depends on these mean and variance parameters rather than the input directly.`);
    write('bo-notation',`In BO, we optimize a black-box function ${inline(String.raw`\processfunction_{\mathrm{true}}`)} from observed pairs ${inline(String.raw`(${input},\obsouts)\in\inpvarsset\times\mathbb{R}`)}, with ${inline(String.raw`\inpvarsset\subset\mathbb{R}^{\dims{\inpvars}}`)}. At iteration ${inline(String.raw`\boiteration`)}, the ${inline(String.raw`\Numobservation_{\boiteration}`)} observations ${inline(String.raw`\observeddata_{\boiteration}=\{(\cusvector{\inpvars}_{\numobservation},\obsouts_{\numobservation})\}_{\numobservation=1}^{\Numobservation_{\boiteration}}`)} guide the next evaluation. The surrogate predicts mean ${inline(String.raw`\distmean`)} and variance ${inline(String.raw`\distcov`)}. We optimize the acquisition function ${inline(String.raw`\acqf(${input})`)} to choose the next input.`);
    write('posterior-map',display(String.raw`\manifoldmap_{\boiteration}:\inpvarsset\to\manifold,\quad ${input}\mapsto${parameters}=(\distmean_{\boiteration,${input}},\distcov_{\boiteration,${input}})^{\top}`));
    // write('posterior-symbols',`The posterior map ${inline(String.raw`\manifoldmap_{\boiteration}`)} maps an input to a predictive state ${inline(theta)}. For a scalar Gaussian, ${inline(String.raw`\manifold=\mathbb{R}\times\mathbb{R}_{+}`)} is the mean and variance space. For analytic acquisitions, ${inline(String.raw`\acqf(${input})=\acqfdistfunctional(${parameters})`)} gives the expected utility for a given predictive state.`);
    write('geometry-definitions',`<p>The Jacobian ${inline(jacobian)} describes how predictive parameters change with the input. The Fisher information matrix ${inline(metric)} quantifies the sensitivity of the predictive distribution ${inline(String.raw`\probability(\obsouts;${theta})`)} to changes in ${inline(theta)}. The pullback tensor ${inline(tensor)} expresses that sensitivity with respect to changes in input coordinates ${inline(input)}:</p><div class="scroll-equation">${display(String.raw`${jacobian}=\frac{\partial${parameters}}{\partial${input}^{\top}},\qquad ${tensor}=${jacobian}^{\top}${metric}${jacobian}.`)}</div>`);
    write('squared-bound',display(String.raw`\|\nabla_{${input}}\acqf(${input})\|_2^2\leq\underbrace{\mathrm{tr}(${tensor})}_{\text{predictive sensitivity}}\;\underbrace{\acqfsensitivity(${parameters})}_{\text{acquisition sensitivity}}`));
    write('bound-interpretation',`The pullback tensor ${inline(tensor)} measures local predictive sensitivity; ${inline(String.raw`\acqfsensitivity(${parameters})`)} measures acquisition sensitivity. When acquisition sensitivity is bounded, a vanishing pullback trace forces the acquisition gradient to vanish. <a href="#gradient-bound-figure">Figure D</a> shows this relation.`);
    write('trace-local-takeaway',`Far from observed points, a GP with squared exponential kernel returns toward its prior and the pullback trace ${inline(String.raw`\mathrm{tr}(${tensor})`)} falls sharply. With bounded acquisition sensitivity, the gradient vanishes as the trace tends to zero.`);
    write('scaling-fixed-label',`Fixed ${inline(String.raw`\lengthscale`)}`);
    write('scaling-subcritical-label',inline(String.raw`\lengthscale\propto\dims{\inpvars}^{1/4}`));
    write('scaling-critical-label',inline(String.raw`\lengthscale\propto\sqrt{\dims{\inpvars}}`));
    write('scaling-supercritical-label',inline(String.raw`\lengthscale\propto\dims{\inpvars}^{3/4}`));
    write('scaling-introduction',`A dimension-scaled prior has a typical lengthscale ${inline(String.raw`\lengthscale\propto\dims{\inpvars}^{\lengthscaleexponent}`)}, where ${inline(String.raw`\lengthscaleexponent`)} controls its growth with input dimension. ${inline(String.raw`\lengthscaleexponent=1/2`)} gives the slowest asymptotic decay of the pullback trace among power-law scalings. The trace still tends to zero.`);
    write('scaling-regimes',`<div style="--regime-color:var(--magenta)"><b>${inline(String.raw`\lengthscaleexponent<1/2`)}</b><p>Correlations vanish; the trace collapses rapidly.</p></div><div class="critical-regime" style="--regime-color:var(--indigo)"><svg class="regime-star" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/></svg><b>${inline(String.raw`\lengthscaleexponent=1/2`)}</b><p>Correlations remain; the trace decays at order ${inline(String.raw`\dims{\inpvars}^{-1}`)}.</p></div><div style="--regime-color:var(--violet)"><b>${inline(String.raw`\lengthscaleexponent>1/2`)}</b><p>The kernel becomes flat; the trace decays faster.</p></div>`);
    write('spectral-context',`For a scalar Gaussian with positive variance, ${inline(factor)} is the derivative from the surrogate and ${inline(direction)} the derivative from the utility of the acquistion function.`);
    write('stationary-gradient-condition',inline(String.raw`\nabla_{${input}}\acqf(${input})=\cusvector{0}`));
    // Reuse the author's paragraph, including rendered mathematics, without duplicating IDs.
    const stationaryIntroduction=document.getElementById('stationary-introduction').cloneNode(true);
    stationaryIntroduction.querySelectorAll('[id]').forEach(element=>element.removeAttribute('id'));
    write('stationary-mobile-summary',stationaryIntroduction.innerHTML);
    write('spectral-factors',display(String.raw`\nabla_{${input}}\acqf(${input})=${factor}^{\top}${direction},\quad ${factor}=${metric}^{1/2}${jacobian},\quad ${direction}=${metric}^{-1/2}\nabla_{${theta}}\acqfdistfunctional(${parameters}),\quad ${companion}=${factor}${factor}^{\top}.`));
    write('rayleigh-meaning',`For nonzero ${inline(direction)}, the Rayleigh's quotient ${inline(String.raw`${direction}^{\top}${companion}${direction}/\|${direction}\|_2^2`)} lies between the smallest and largest eigenvalues ${inline(String.raw`\fishereigenvalue_{\min}`)} and ${inline(String.raw`\fishereigenvalue_{\max}`)} of ${inline(companion)}:`);
    write('spectral-bound',display(String.raw`\fishereigenvalue_{\min}\|${direction}\|_2^2\leq\|\nabla_{${input}}\acqf(${input})\|_2^2=${direction}^{\top}${companion}${direction}\leq\fishereigenvalue_{\max}\|${direction}\|_2^2\leq\acqfsensitivity(${parameters})\,\mathrm{tr}(${tensor}).`));
    write('spectral-trace-link',`We show that for univariate predictive posterior GP, at stationary points the mean and variance gradients ${inline(String.raw`\nabla_{${input}}\distmean_{\boiteration,${input}}`)} and ${inline(String.raw`\nabla_{${input}}\distcov_{\boiteration,${input}}`)} are collinear and in the opposite directions.`);
    write('stationary-figure-title',`Characteristics of the mean gradient ${inline(String.raw`\nabla_{${input}}\distmean_{\boiteration,${input}}`)} and variance gradient ${inline(String.raw`\nabla_{${input}}\distcov_{\boiteration,${input}}`)}`);
    write('acquisition-gradient-label',inline(String.raw`\nabla_{${input}}\acqf(${input})`));
    write('mean-gradient-label',inline(String.raw`\nabla_{${input}}\distmean_{\boiteration,${input}}`));
    write('variance-gradient-label',inline(String.raw`\nabla_{${input}}\distcov_{\boiteration,${input}}`));

    write('fitr-construction',`<p>FITR makes the region narrower where the predictive distribution changes more rapidly. A regularized diagonal approximation gives axis aligned trust region.</p><p><a href="https://arxiv.org/pdf/2609.31107#page=7" target="_blank" rel="noopener">Algorithm and implementation in the paper</a>.</p>`);
  }
  root.ScrollContent={populate};
})(window);
