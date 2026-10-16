import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import IncidentCard from '../src/components/IncidentCard.js';
import { Incident } from '../src/types/index.js';

describe('IncidentCard Component', () => {
  const mockIncident: Incident = {
    id: 'inc-001',
    title: 'Flash Flood on GST Road',
    description: 'Rapid stormwater runoff blocking central lanes.',
    incident_type: 'flood',
    severity: 'high',
    status: 'active',
    location_name: 'Kattankulathur, Chennai',
    latitude: 12.823,
    longitude: 80.044,
    radius_km: 15,
    event_time: new Date().toISOString(),
    source: 'SIMULATED',
    is_simulated: true,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    distance_km: 4.8
  };

  it('renders incident title, description, and location correctly', () => {
    const onSelect = vi.fn();
    render(<IncidentCard incident={mockIncident} onSelect={onSelect} />);

    expect(screen.getByText('Flash Flood on GST Road')).toBeInTheDocument();
    expect(screen.getByText('Rapid stormwater runoff blocking central lanes.')).toBeInTheDocument();
    expect(screen.getByText('Kattankulathur, Chennai')).toBeInTheDocument();
  });

  it('displays severity badge and status badge', () => {
    render(<IncidentCard incident={mockIncident} onSelect={vi.fn()} />);

    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays "Simulated Drill" badge when incident is simulated', () => {
    render(<IncidentCard incident={mockIncident} onSelect={vi.fn()} />);

    expect(screen.getByText('Simulated Drill')).toBeInTheDocument();
  });

  it('displays "Official: USGS" badge when incident is official from USGS', () => {
    const officialIncident: Incident = {
      ...mockIncident,
      is_simulated: false,
      source: 'USGS'
    };

    render(<IncidentCard incident={officialIncident} onSelect={vi.fn()} />);

    expect(screen.getByText('Official: USGS')).toBeInTheDocument();
  });

  it('displays distance in kilometers when distance_km is provided', () => {
    render(<IncidentCard incident={mockIncident} onSelect={vi.fn()} />);

    expect(screen.getByText('4.8 km away')).toBeInTheDocument();
  });

  it('invokes onSelect handler when clicked', () => {
    const onSelect = vi.fn();
    render(<IncidentCard incident={mockIncident} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Flash Flood on GST Road'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(mockIncident);
  });
});
