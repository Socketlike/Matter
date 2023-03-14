import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';
import { join } from 'path';
import { bundle, install, report, setup } from './plugins.js';
import manifest from '../manifest.json' assert { type: 'json' };

const prod = process.argv.includes('--production');
const shouldInstall = !process.argv.includes('--no-install');
const shouldBundle = process.argv.includes('--bundle');

Object.defineProperty(globalThis, 'repluggedFolder', {
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
});

const common = {
  absWorkingDir: process.cwd(),
  bundle: true,
  logLevel: 'info',
  minify: prod,
  platform: 'browser',
  plugins: [
    lessLoader({
      paths: ['src', 'src/scheme', 'src/ui'],
    }),
    setup(shouldBundle, manifest),
    install(shouldInstall, join(repluggedFolder, 'themes', manifest.id)),
    bundle(shouldBundle, manifest),
    report(),
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
