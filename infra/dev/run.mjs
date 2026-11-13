import { spawn } from 'node:child_process';

const SERVICES = [
  { name: 'identity', port: 4001 },
  { name: 'marketplace', port: 4002 },
  { name: 'contracts', port: 4003 },
  { name: 'reputation', port: 4004 },
];
const DATABASE_HOST = 'localhost:54329/construyeconecta';

const serviceUrls = Object.fromEntries(
  SERVICES.map(({ name, port }) => [`${name.toUpperCase()}_URL`, `http://localhost:${port}`]),
);

const children = SERVICES.map(({ name, port }) => {
  const password = process.env[`DB_PASSWORD_${name.toUpperCase()}`];
  return spawn('node', ['dist/main.js'], {
    cwd: `services/${name}`,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...serviceUrls,
      PORT: String(port),
      SERVICE_DATABASE_URL: `postgres://${name}_service:${password}@${DATABASE_HOST}`,
    },
  });
});

if (!process.argv.includes('--services-only')) {
  children.push(
    spawn('pnpm', ['--filter', '@cc/web', 'dev'], {
      stdio: 'inherit',
      env: { ...process.env, ...serviceUrls },
    }),
  );
}

const stop = () => {
  for (const child of children) {
    child.kill();
  }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
