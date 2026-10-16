import { CreateIncidentInput } from '../types/index.js';

export interface DisasterEventProvider {
  /**
   * Unique name of the provider adapter
   */
  readonly name: string;

  /**
   * Whether this provider generates simulated/drill events or ingests official feeds
   */
  readonly isSimulated: boolean;

  /**
   * Fetches latest disaster incidents from this provider source
   */
  fetchEvents(): Promise<CreateIncidentInput[]>;

  /**
   * Validates if the provider's upstream service is accessible
   */
  healthCheck(): Promise<boolean>;
}
