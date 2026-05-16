import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const generatedClientPath = path.resolve('prisma/generated/prisma/client.ts');
const schemaDirPath = path.resolve('prisma/schema');

function getLatestSchemaMtimeMs(dirPath) {
  return readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith('.prisma'))
    .map((fileName) => statSync(path.join(dirPath, fileName)).mtimeMs)
    .reduce((latest, current) => Math.max(latest, current), 0);
}

function ensurePrismaClient() {
  const generatedExists = existsSync(generatedClientPath);
  const schemaLatestMtimeMs = getLatestSchemaMtimeMs(schemaDirPath);
  const generatedMtimeMs = generatedExists ? statSync(generatedClientPath).mtimeMs : 0;
  const needsGenerate = !generatedExists || generatedMtimeMs < schemaLatestMtimeMs;

  if (!needsGenerate) {
    console.log('Prisma client is up to date');
    return;
  }

  console.log('Prisma schema changed, generating client...');
  const result = spawnSync('pnpm', ['exec', 'prisma', 'generate'], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensurePrismaClient();
