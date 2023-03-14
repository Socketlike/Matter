import asar from '@electron/asar';
import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';
import fs from 'fs';
import { join } from 'path';
import manifest from '../manifest.json' assert { type: 'json' };

const cwd = process.cwd();
const prod = process.argv.includes('--production');
const noInstall = process.argv.includes('--no-install');
const bundle = process.argv.includes('--bundle');

Object.defineProperties(globalThis, {
  repluggedFolder: {
    get: () => {
      switch (process.platform) {
        case 'win32':
          return join(process.env.APPDATA || '', 'replugged');
        case 'darwin':
          return join(process.env.HOME || '', 'Library', 'Application Support', 'replugged');
        default:
          return process.env.XDG_CONFIG_HOME ? join(process.env.XDG_CONFIG_HOME, 'replugged') : join(process.env.HOME || '', '.config', 'replugged');
      }
    },
  },
  installDest: {
    get: () => join(repluggedFolder, 'themes', manifest.id),
  },
});

const common = {
  absWorkingDir: cwd,
  bundle: true,
  logLevel: 'info',
  minify: prod,
  platform: 'browser',
  plugins: [
    lessLoader({
      paths: ['src', 'src/scheme', 'src/ui'],
    }),
    {
      name: 'setup',
      setup: (build) =>
        build.onStart(() => {
          if (!fs.existsSync('bundle')) fs.mkdirSync('bundle');
          if (!fs.existsSync('dist')) fs.mkdirSync('dist');
          if (fs.existsSync('dist') && fs.readdirSync('dist').length)
            fs.readdirSync('dist').forEach((name) => fs.rmSync(`dist/${name}`, { recursive: true }));
          fs.writeFileSync('dist/manifest.json', JSON.stringify(manifest));
        }),
    },
    {
      name: 'install',
      setup: noInstall
        ? () => void 0
        : (build) =>
            build.onEnd(() => {
              if (fs.existsSync(installDest)) fs.rmSync(installDest, { recursive: true });
              fs.cpSync('dist', installDest, { recursive: true });
              console.log(`\x1b[1;36mbuild:\x1b[0m installed newly built version`);
            }),
    },
    {
      name: 'bundle',
      setup: !bundle
        ? () => void 0
        : (build) =>
            build.onEnd(() => {
              asar.createPackage('dist', `bundle/${manifest.id}.asar`);
              fs.copyFileSync('dist/manifest.json', `bundle/${manifest.id}.json`);

              console.log(`\n\x1b[1;36mbuild:\x1b[0m bundled`);
            }),
    },
  ],
  sourcemap: !prod,
  target: 'chrome91',
};

const targets = [];

if ('main' in manifest) {
  targets.push(
    esbuild.build({
      ...common,
      entryPoints: [manifest.main],
      outfile: 'dist/main.css',
    }),
  );

  manifest.main = 'main.css';
}

if ('splash' in manifest) {
  targets.push(
    esbuild.build({
      ...common,
      entryPoints: [manifest.splash],
      outfile: 'dist/splash.css',
    }),
  );

  manifest.splash = 'splash.css';
}

await Promise.all(targets);
