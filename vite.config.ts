import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'path';
import { resolve } from 'path';

export default defineConfig({
    base: './',
    plugins: [dts({ rollupTypes: true })],

    resolve: {
        alias: {  
            '@': path.resolve(__dirname, 'src'),
            '@store': path.resolve(__dirname, 'src/store'),
        },
    },

    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'GamzixCore',
            fileName: 'index',
        },
    },
});
