// Takes every docs/screenshots image from the harness: 800x771 at 2x, dark theme, generic data.
// Usage: node shots.mjs [Name,Name...] to take all or only the named ones. Each PNG goes to docs/screenshots/.
import { fileURLToPath } from 'node:url';
import { open } from './shoot.mjs';
const OUT = fileURLToPath(new URL('../../docs/screenshots', import.meta.url));
const only = process.argv[2];

const shots = {
  Storage: { page: 'storage', act: async () => {} }
};

for (const [file, s] of Object.entries(shots)) {
  if (only && !only.split(',').includes(file)) continue;
  const { b, p } = await open(s.page, s.vp);
  await s.act(p);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${file}.png` });
  const errs = await p.evaluate(() => window.__errs);
  console.log(file, errs.length ? JSON.stringify(errs) : 'ok');
  await b.close();
}
