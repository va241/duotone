/* Natural photo treatment. Shared, deterministic pipeline for preview and export. */
(() => {
  'use strict';
  const defaults = { normalize: 65, exposure: 0, contrast: 4, shadows: 8, highlights: 8, temperature: 0, tint: 0, saturation: 0, grain: 1 };
  const presets = {
    'Natural': defaults,
    'Soft daylight': { ...defaults, contrast: -8, shadows: 16, highlights: 20, temperature: 3, saturation: -5, grain: 0.5 },
    'Warm documentary': { ...defaults, contrast: 8, temperature: 10, saturation: -8, grain: 2.5 },
    'Neutral / no edits': Object.fromEntries(Object.keys(defaults).map(key => [key, 0]))
  };
  const fields = [
    ['normalize', 'Level normalization', 0, 100, 1, '%'],
    ['exposure', 'Exposure', -1.5, 1.5, 0.05, ' EV'],
    ['contrast', 'Contrast', -30, 30, 1, ''],
    ['shadows', 'Lift shadows', 0, 40, 1, ''],
    ['highlights', 'Soften highlights', 0, 40, 1, ''],
    ['temperature', 'Temperature · cool / warm', -30, 30, 1, ''],
    ['tint', 'Tint · green / magenta', -30, 30, 1, ''],
    ['saturation', 'Saturation', -40, 40, 1, ''],
    ['grain', 'Noise / grain', 0, 8, 0.25, '%']
  ];
  let state = { ...defaults };
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
  const luminance = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
  const statistics = new WeakMap();
  function analyze(src) {
    if (statistics.has(src)) return statistics.get(src);
    const histogram = new Float64Array(256), d = src.data;
    let total = 0;
    const stride = Math.max(1, Math.floor(d.length / 4 / 150000));
    for (let i = 0; i < d.length; i += 4 * stride) {
      const weight = d[i + 3] / 255;
      histogram[Math.round(luminance(d[i], d[i + 1], d[i + 2]))] += weight;
      total += weight;
    }
    function percentile(fraction) {
      let count = 0;
      for (let i = 0; i < 256; i++) { count += histogram[i]; if (count >= total * fraction) return i / 255; }
      return 1;
    }
    const low = percentile(.01), high = percentile(.99), median = percentile(.5);
    // Limit correction for night scenes, flat images and intentionally bright scenes.
    const black = Math.min(low, .12), white = Math.max(high, .72);
    const midpoint = clamp((median - black) / (white - black), .05, .95);
    const gamma = high - low < .06 || !total ? 1 : clamp(Math.log(.46) / Math.log(midpoint), .75, 1.3);
    const result = { black, white, gamma, flat: high - low < .06 || !total };
    statistics.set(src, result);
    return result;
  }
  function process(src, out, p) {
    const d = src.data, o = out.data, stats = analyze(src);
    const strength = p.normalize / 100, exposure = 2 ** p.exposure;
    const contrast = 1 + p.contrast / 100, saturation = 1 + p.saturation / 100;
    let seed = 0x9e3779b9;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) { o.set(d.subarray(i, i + 4), i); continue; }
      let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const l = luminance(r, g, b);
      const normalized = stats.flat ? l : Math.pow(clamp((l - stats.black) / (stats.white - stats.black)), stats.gamma);
      let target = (l + (normalized - l) * strength) * exposure;
      target = clamp((target - .5) * contrast + .5);
      target += p.shadows / 100 * (1 - target) ** 2 * target * 2;
      target -= p.highlights / 100 * target ** 3 * (1 - target) * 2;
      // Scale channels together to preserve hue while adjusting luminance.
      const scale = l > .0001 ? target / l : 1;
      r *= scale; g *= scale; b *= scale;
      r *= 1 + p.temperature * .003 + p.tint * .001;
      g *= 1 - p.tint * .002;
      b *= 1 - p.temperature * .003 + p.tint * .001;
      const gray = luminance(r, g, b);
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const noise = ((seed >>> 0) / 4294967295 * 2 - 1) * p.grain / 100;
      o[i] = clamp(gray + (r - gray) * saturation + noise) * 255;
      o[i + 1] = clamp(gray + (g - gray) * saturation + noise) * 255;
      o[i + 2] = clamp(gray + (b - gray) * saturation + noise) * 255;
      o[i + 3] = d[i + 3];
    }
  }
  function mount(root, onChange) {
    root.innerHTML = '<div class="label">Photo treatment <button class="linkbtn" id="photoReset">Reset</button></div><p class="hint" style="margin:0">One shared look for the whole batch. Levels adapt to each photo; all other adjustments apply equally. Your photos stay on this device.</p><div class="presets" id="photoPresets"></div><div class="group" id="photoSliders"></div><p class="hint" style="margin:0">Normalization gently aligns tonal range and midtones while keeping natural color. Start with Natural, then adjust the batch. Noise adds monochrome grain; it does not remove noise. Preview grain at full size.</p>';
    const buttons = [];
    const controls = [];
    const sync = () => {
      controls.forEach(({ key, input, output, unit }) => { input.value = state[key]; output.textContent = state[key] + unit; });
      buttons.forEach(({ button, values }) => button.setAttribute('aria-pressed', Object.keys(defaults).every(k => state[k] === values[k])));
    };
    Object.entries(presets).forEach(([name, values]) => {
      const button = document.createElement('button'); button.className = 'btn small'; button.textContent = name;
      button.onclick = () => { state = { ...values }; sync(); onChange(); };
      root.querySelector('#photoPresets').append(button); buttons.push({ button, values });
    });
    fields.forEach(([key, label, min, max, step, unit]) => {
      const row = document.createElement('div'); row.className = 'slider';
      row.innerHTML = `<div class="row"><label for="photo_${key}">${label}</label><output for="photo_${key}"></output></div><input id="photo_${key}" type="range" min="${min}" max="${max}" step="${step}">`;
      const input = row.querySelector('input'), output = row.querySelector('output');
      input.oninput = () => { state[key] = +input.value; sync(); onChange(); };
      root.querySelector('#photoSliders').append(row); controls.push({ key, input, output, unit });
    });
    root.querySelector('#photoReset').onclick = () => { state = { ...defaults }; sync(); onChange(); };
    sync();
  }
  window.PhotoTreatment = { mount, process, settings: () => ({ ...state }) };
})();
