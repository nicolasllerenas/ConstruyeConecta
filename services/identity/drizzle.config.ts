import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './dist/schema.js',
  out: './drizzle',
  schemaFilter: ['identity'],
  breakpoints: false,
});
