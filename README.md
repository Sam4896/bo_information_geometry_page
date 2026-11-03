# Information Geometry of Bayesian Optimization

Interactive project website for the NeurIPS paper **Bayesian Optimization with Fisher Information Geometry: Gradient Bounds and Trust-Region Methods**.

- Scrollable FITR project page: `site/index.html`
- Existing FITR route: `site/fitr/index.html`
- Paper: https://arxiv.org/pdf/2609.31107
- Contact: https://www.linkedin.com/in/saksham4k/

The HTML, CSS, and JavaScript sources are in `site/`. The website uses local math-rendering assets and does not need a package installation or build service. Open `site/index.html` locally, or serve `site/` with a static web server.

Pushes to `NeurIPS_publish` deploy only `site/` to GitHub Pages through `.github/workflows/pages.yml`. The workflow checks that unpublished workspace and research directories are absent. This repository contains only the public website export, not the research repository or its history.

Live website: https://sam4896.github.io/bo_information_geometry_page/

KaTeX is distributed under the MIT license; its license is included in `site/katex/LICENSE`.
