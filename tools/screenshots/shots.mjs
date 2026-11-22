// Takes every docs/screenshots image from the harness: 800x771 at 2x, dark theme, generic data.
// Usage: node shots.mjs [Name,Name...] to take all or only the named ones. Each PNG goes to docs/screenshots/.
import { fileURLToPath } from 'node:url';
import { open } from './shoot.mjs';
const OUT = fileURLToPath(new URL('../../docs/screenshots', import.meta.url));
const only = process.argv[2];

// Opens a disk's dialog by the name its row shows, after the All filter when it is not in use.
const openDisk = (name, all) => async (p) => {
  await p.evaluate(async ([n, a]) => {
    if (a) document.querySelector('.base-pill[data-value=all]').click();
    await new Promise((r) => setTimeout(r, 300));
    [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === n).click();
    await new Promise((r) => setTimeout(r, 900));
    // A click from a script leaves a keyboard focus ring that a mouse click does not.
    if (document.activeElement) document.activeElement.blur();
  }, [name, all]);
};

// Scrolls the open dialog so a section's heading sits at its top.
const scrollTo = (heading) => async (p) => {
  await p.evaluate((h) => {
    const d = [...document.querySelectorAll('.base-dialog')].pop();
    const el = [...d.querySelectorAll('h3')].find((x) => x.textContent.trim().toLowerCase() === h.toLowerCase());
    el.scrollIntoView({ block: 'start' });
  }, heading);
};

const steps = (...fns) => async (p) => { for (const f of fns) { await f(p); await p.waitForTimeout(250); } };

const shots = {
  Storage: { page: 'storage', act: async () => {} },
  StorageAll: { page: 'storage', act: async (p) => {
    await p.evaluate(() => { document.querySelector('.base-pill[data-value=all]').click(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('[data-str="HeaderDisks"]').scrollIntoView({ block: 'start' }));
  } },
  DiskDetails: { page: 'storage', act: openDisk('media1') },
  DiskAlerts: { page: 'storage', act: steps(openDisk('media1'), async (p) => {
    await p.evaluate(() => {
      const d = [...document.querySelectorAll('.base-dialog')].pop();
      d.querySelector('.storage-dialog-alerts .base-checkbox input').click();
    });
  }, scrollTo('Alerts')) },
  DiskFolders: { page: 'storage', act: steps(openDisk('System'), scrollTo('Folders')) },
  ReadOnly: { page: 'storage', act: steps(openDisk('music'), scrollTo('Folders')) },
  ShareAddress: { page: 'storage', act: steps(openDisk('media2'), scrollTo('Share address')) },
  Format: { page: 'storage', act: steps(openDisk('WDC WD80EFZZ', true), scrollTo('Format')) },
  NotMounted: { page: 'storage', act: openDisk('Flash', true) },
  EraseConfirm: { page: 'storage', act: steps(openDisk('Flash', true), async (p) => {
    await p.evaluate(() => {
      const d = [...document.querySelectorAll('.base-dialog')].pop();
      [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Erase and format').click();
    });
    await p.waitForTimeout(500);
  }) },
  NewFolder: { page: 'storage', act: steps(openDisk('media1'), scrollTo('New folder')) },
  Settings: { page: 'settings', act: async () => {} },
  SettingsHealth: { page: 'settings', act: async (p) => {
    await p.evaluate(() => document.querySelector('#healthEditorMount').scrollIntoView({ block: 'start' }));
  } },
  SettingsMissing: { page: 'settings', act: async (p) => {
    await p.evaluate(() => document.querySelector('#scanGuardChoices').closest('.base-section').scrollIntoView({ block: 'start' }));
  } },
  StorageWindows: { page: 'storage&os=windows', act: async () => {} },
  StoragePhone: { page: 'storage', vp: { width: 375, height: 812 }, act: async () => {} }
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
