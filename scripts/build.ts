import esbuild from 'esbuild';
import origManifest from '../manifest.json';
import { join } from 'path';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { ThemeManifest } from 'replugged/dist/types/addon';

const REPLUGGED_FOLDER_NAME = 'replugged';
const manifest: ThemeManifest = origManifest;
const main = manifest.main || 'src/main.css';
const splash = manifest.splash || (existsSync('src/splash.css') ? 'src/splash.css' : undefined);
const prod = process.argv.includes('--prod');

const CONFIG_PATH = (() => {
  if (process.platform === 'win32') return join(process.env.APPDATA || '', REPLUGGED_FOLDER_NAME);
  else if (process.platform === 'darwin')
    return join(process.env.HOME || '', 'Library', 'Application Support', REPLUGGED_FOLDER_NAME);
  else
    return join(
      process.env?.XDG_CONFIG_HOME || process.env.HOME || '',
      '.config',
      REPLUGGED_FOLDER_NAME,
    );
})();

const install: esbuild.Plugin = {
  name: 'install',
  setup: (build) => {
    build.onStart(() => {
      console.log(
        '🛠️  Building for',
        prod ? '\x1b[39;32m\x1b[22;1m🌐 Production' : '\x1b[39;34m\x1b[22;1m🔨 Development',
        '\x1b[0mand',
        !process.env.NO_INSTALL && !process.argv.includes('--no-install')
          ? '\x1b[39;32m\x1b[22;1minstalling'
          : '\x1b[39;31m\x1b[22;1mnot installing',
      );
      if (existsSync('dist')) for (const file of readdirSync('dist')) rmSync(join('dist', file));
      else mkdirSync('dist');
      writeFileSync('dist/manifest.json', JSON.stringify(manifest));
    });
    build.onEnd(() => {
      if (!process.env.NO_INSTALL && !process.argv.includes('--no-install')) {
        const dest = join(CONFIG_PATH, 'themes', manifest.id);
        if (existsSync(dest)) rmSync(dest, { recursive: true });
        cpSync('dist', dest, { recursive: true });
        console.log('Installed updated version');
      }
    });
  },
};

const common: esbuild.BuildOptions = {
  absWorkingDir: join(__dirname, '..'),
  bundle: true,
  logLevel: 'info',
  minify: prod,
  plugins: [install],
  sourcemap: !prod,
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

Promise.all(targets);
