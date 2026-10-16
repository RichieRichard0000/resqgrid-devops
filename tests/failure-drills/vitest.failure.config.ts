import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/failure-drills/*.fixture.ts'],
    reporters: ['default']
  }
});
