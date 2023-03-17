import fs from 'fs';
import asar from '@electron/asar';

export const setup = (bundle, manifest) => ({
  name: 'setup',
  setup: (build) =>
    build.onStart(() => {
      if (!fs.existsSync('dist')) {
        console.log('\x1b[1;36mbuild:\x1b[0m creating dist folder');
        fs.mkdirSync('dist');
      }
      if (fs.existsSync('dist') && fs.readdirSync('dist').length) {
        console.log('\x1b[1;36mbuild:\x1b[0m cleaning dist folder');
        fs.readdirSync('dist').forEach((name) => fs.rmSync(`dist/${name}`, { recursive: true }));
      }
      if (bundle && !fs.existsSync('bundle')) {
        console.log('\x1b[1;36mbuild:\x1b[0m creating bundle folder');
        fs.mkdirSync('bundle');
      }

      fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest));
    }),
});

export const install = (enabled, installDest) => ({
  name: 'install',
  setup: !enabled
    ? () => void 0
    : (build) =>
        build.onEnd(() => {
          if (fs.existsSync(installDest)) fs.rmSync(installDest, { recursive: true });
          fs.cpSync('dist', installDest, { recursive: true });
          console.log(`\x1b[1;36mbuild:\x1b[0m installed newly built version`);
        }),
});

export const bundle = (enabled, manifest) => ({
  name: 'bundle',
  setup: !enabled
    ? () => void 0
    : (build) =>
        build.onEnd(() => {
          asar.createPackage('dist', `bundle/${manifest.id}.asar`);
          fs.copyFileSync('dist/manifest.json', `bundle/${manifest.id}.json`);

          console.log(`\x1b[1;36mbuild:\x1b[0m bundled`);
        }),
});

export const report = () => ({
  name: 'report',
  setup: (build) =>
    build.onEnd((result) => {
      console.log(
        '\x1b[1;36mbuild:\x1b[0m finished with',
        `${result.errors.length ? `\x1b[1;31m${result.errors.length}` : '\x1b[1;32m0'} error(s)\x1b[0m`,
        `and ${result.warnings.length ? `\x1b[1;33m${result.warnings.length}` : `\x1b[1;32m0`} warning(s)\x1b[0m`,
      );
    }),
});
