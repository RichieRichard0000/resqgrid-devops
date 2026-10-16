import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationControl from '../src/components/LocationControl.js';

describe('LocationControl Component', () => {
  it('renders "Enable My Location" prompt when GPS is not yet acquired', () => {
    const onRequestLocation = vi.fn();
    render(
      <LocationControl
        status="idle"
        location={null}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={onRequestLocation}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    expect(screen.getByText('Enable My Location')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Enable My Location'));
    expect(onRequestLocation).toHaveBeenCalledTimes(1);
  });

  it('renders current coordinates and radius presets when GPS is granted', () => {
    const onSetRadius = vi.fn();
    const onClear = vi.fn();

    render(
      <LocationControl
        status="granted"
        location={{
          latitude: 12.823,
          longitude: 80.044,
          radiusKm: 50,
          accuracyMeters: 15
        }}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={onSetRadius}
        onClearLocation={onClear}
      />
    );

    expect(screen.getByText('GPS Active')).toBeInTheDocument();
    expect(screen.getByText('12.8230°N')).toBeInTheDocument();
    expect(screen.getByText('80.0440°E')).toBeInTheDocument();

    // Click radius preset (e.g. 25 km)
    fireEvent.click(screen.getByText('25 km'));
    expect(onSetRadius).toHaveBeenCalledWith(25);

    // Clear GPS button
    fireEvent.click(screen.getByText('Clear GPS'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('displays error message when permission is denied or unavailable', () => {
    render(
      <LocationControl
        status="denied"
        location={null}
        radiusKm={50}
        errorMessage="Location permission was denied. Enable permission in browser settings."
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    expect(
      screen.getByText('Location permission was denied. Enable permission in browser settings.')
    ).toBeInTheDocument();
  });
});
