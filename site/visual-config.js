/* Read the shared theme once for SVG plots; no private paper content here. */
(function (root) {
  'use strict';
  const theme = getComputedStyle(document.documentElement);
  const read = name => theme.getPropertyValue(name).trim();
  const colors = Object.fromEntries(
    ['ink','muted','indigo','violet','orange','teal','magenta','trace-blue'].map(name => [name, read('--'+name)])
  );
  // Heatmaps need numeric RGB endpoints; CSS keeps their values with the other colors.
  const fieldPalettes = Object.fromEntries(
    ['truth','mean','variance','acquisition'].map(name => {
      const endpoints = ['low','high'].map(end => read('--field-'+name+'-'+end).split(',').map(Number));
      return [name,endpoints];
    })
  );
  root.VisualConfig = Object.freeze({ inputContourDisplayScale: Number(read('--input-contour-display-scale')), logEiColorMinimum: Number(read('--logei-color-min')), colors: Object.freeze(colors), fieldPalettes: Object.freeze(fieldPalettes) });
})(window);
