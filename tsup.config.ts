import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib', // Укажите нужную папку здесь
  format: ['esm', 'cjs'], // Emit both ESM and CJS
  clean: true,
});
