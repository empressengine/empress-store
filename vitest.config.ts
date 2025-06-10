import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
           '@': path.resolve(__dirname, 'src'),
           '@store': path.resolve(__dirname, 'src/store'),
        },
    },
    test: {
        globals: true,
        coverage: {
            reporter: ['text', 'html'],
        },
    },
});
