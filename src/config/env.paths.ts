import { fileURLToPath } from 'node:url';

export const envFilePaths = [
  fileURLToPath(new URL('../../.env', import.meta.url)),
  fileURLToPath(new URL('../../../.env', import.meta.url)),
];
