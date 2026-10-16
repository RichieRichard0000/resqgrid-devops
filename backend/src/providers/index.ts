import { DisasterEventProvider } from './types.js';
import { simulatedProvider } from './simulatedProvider.js';
import { usgsProvider } from './usgsProvider.js';
import { weatherProvider } from './weatherProvider.js';
import { logger } from '../utils/logger.js';

export * from './types.js';
export * from './simulatedProvider.js';
export * from './usgsProvider.js';
export * from './weatherProvider.js';

export class ProviderManager {
  private providers: Map<string, DisasterEventProvider> = new Map();

  constructor() {
    // Register built-in providers
    this.register(simulatedProvider);
    this.register(usgsProvider);
    this.register(weatherProvider);
  }

  register(provider: DisasterEventProvider): void {
    this.providers.set(provider.name, provider);
    logger.info({ provider: provider.name, isSimulated: provider.isSimulated }, 'Registered disaster event provider');
  }

  getProvider(name: string): DisasterEventProvider | undefined {
    return this.providers.get(name);
  }

  getAllProviders(): DisasterEventProvider[] {
    return Array.from(this.providers.values());
  }

  async checkAllHealth(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = await provider.healthCheck();
      } catch {
        results[name] = false;
      }
    }
    return results;
  }
}

export const providerManager = new ProviderManager();
export default providerManager;
