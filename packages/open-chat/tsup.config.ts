import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'web-component': 'src/web-component.ts',
    },
    format: ['esm'],
    sourcemap: true,
    dts: true,
    clean: true,
    splitting: false,
    minify: false,
    target: 'es2020',
  },
  {
    entry: {
      'web-component.global': 'src/web-component.auto.ts',
    },
    format: ['iife'],
    sourcemap: true,
    minify: true,
    clean: false,
    splitting: false,
    target: 'es2020',
    globalName: 'OpenChatElement',
  },
])