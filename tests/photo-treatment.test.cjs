const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../photo-treatment.js'), 'utf8'), context);
const tool = context.window.PhotoTreatment;
const neutral = Object.fromEntries(Object.keys(tool.settings()).map(k => [k, 0]));
const source = values => ({ data: Uint8ClampedArray.from(values), width: values.length / 4, height: 1 });
const process = (src, settings = neutral) => { const out = { data: new Uint8ClampedArray(src.data.length) }; tool.process(src, out, settings); return out.data; };
test('neutral treatment is lossless, including alpha and transparent RGB', () => {
  const src = source([12, 89, 213, 255, 255, 2, 78, 128, 3, 5, 7, 0, 0, 0, 0, 255]);
  assert.deepEqual(process(src), src.data);
});
test('normalization reduces midpoint differences between differently exposed batches', () => {
  const ramp = gain => source(Array.from({length: 256}, (_, i) => { const n = Math.round((40 + i * .6) * gain); return [n, n, n, 255]; }).flat());
  const a = ramp(.7), b = ramp(1.3), settings = {...neutral, normalize:100};
  const mean = d => d.reduce((s, v, i) => s + (i % 4 === 0 ? v : 0), 0) / (d.length / 4);
  assert.ok(Math.abs(mean(process(a, settings)) - mean(process(b, settings))) < Math.abs(mean(a.data) - mean(b.data)));
});
test('grain is monochrome and deterministic; source and alpha are unchanged', () => {
  const src = source(Array.from({length: 200}, (_, i) => [120, 120, 120, i % 256]).flat());
  const original = src.data.slice(), p = {...neutral, grain: 4};
  const a = process(src, p), b = process(src, p);
  assert.deepEqual(a, b); assert.deepEqual(src.data, original); assert.notDeepEqual(a, original);
  for(let i=0;i<a.length;i+=4) { assert.equal(a[i],a[i+1]); assert.equal(a[i],a[i+2]); assert.equal(a[i+3],original[i+3]); }
});
test('flat photos are not stretched by normalization', () => {
  for(const n of [0, 80, 255]) { const src = source([n,n,n,255]); assert.deepEqual(process(src, {...neutral, normalize:100}),src.data); }
});
test('export settings are independent snapshots', () => {
  const a=tool.settings(); a.grain=99; assert.equal(tool.settings().grain,1);
});
test('inline app scripts parse', () => {
  const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
  for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
});
