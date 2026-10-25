import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { envFilePaths } from '../config/env.paths.js';
import { envSchema } from '../config/env.schema.js';

for (const path of envFilePaths) {
  if (existsSync(path)) {
    loadEnvFile(path);
  }
}

const env = envSchema.parse(process.env);

export default new DataSource({
  type: 'postgres',

  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,

  entities: [],
  synchronize: false,
  migrationsRun: false,

  migrations: [
    fileURLToPath(new URL('./migrations/*{.ts,.js}', import.meta.url)),
  ],
});
