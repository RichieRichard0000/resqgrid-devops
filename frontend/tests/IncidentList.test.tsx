import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IncidentList from '../src/components/IncidentList.js';
import { Incident } from '../src/types/index.js';

describe('IncidentList Component', () => {
  const sampleIncidents: Incident[] = [
    {
      id: 'inc-1',
      title: 'Seismic Tremor',
      description: 'Minor earth vibration.',
      incident_type: 'earthquake',
      severity: 'medium',
      status: 'active',
      location_name: 'Tambaram',
      latitude: 12.92,
      longitude: 80.1,
      radius_km: 20,
      event_time: new Date().toISOString(),
      source: 'SIMULATED',
      is_simulated: true,
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  it('renders loading skeletons when isLoading is true', () => {
    render(
      <IncidentList
        incidents={[]}
        isLoading={true}
        error={null}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByTestId('loading-skeletons')).toBeInTheDocument();
  });

  it('renders error state and triggers onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(
      <IncidentList
        incidents={[]}
        isLoading={false}
        error="Network error reaching server"
        selectedIncident={null}
        onSelectIncident={vi.fn()}
        onRetry={onRetry}
      />
    );

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText('Failed to load incident feed')).toBeInTheDocument();
    expect(screen.getByText('Network error reaching server')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when there are no matching incidents', () => {
    render(
      <IncidentList
        incidents={[]}
        isLoading={false}
        error={null}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No active incidents matching filters')).toBeInTheDocument();
  });

  it('renders incident cards when incidents are present', () => {
    render(
      <IncidentList
        incidents={sampleIncidents}
        isLoading={false}
        error={null}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('Seismic Tremor')).toBeInTheDocument();
    expect(screen.getByText('Tambaram')).toBeInTheDocument();
  });
});
