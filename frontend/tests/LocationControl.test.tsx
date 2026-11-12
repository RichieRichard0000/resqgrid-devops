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

  it('renders GPS Active badge, coordinates, and accuracy when GPS is granted', () => {
    const onSetRadius = vi.fn();
    const onClear = vi.fn();

    render(
      <LocationControl
        status="granted"
        location={{
          latitude: 12.823,
          longitude: 80.044,
          radiusKm: 50,
          accuracyMeters: 15,
          source: 'gps'
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
    expect(screen.getByText(/±15m accuracy/)).toBeInTheDocument();

    // Click radius preset (e.g. 25 km)
    fireEvent.click(screen.getByText('25 km'));
    expect(onSetRadius).toHaveBeenCalledWith(25);

    // Clear Location button
    fireEvent.click(screen.getByText('Clear Location'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders distinct "Manual Pin Active" badge when location source is manual', () => {
    render(
      <LocationControl
        status="granted"
        location={{
          latitude: 12.823,
          longitude: 80.044,
          radiusKm: 50,
          source: 'manual'
        }}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    expect(screen.getByText('Manual Pin Active')).toBeInTheDocument();
    expect(screen.getByText(/Fixed campus benchmark — not real GPS/)).toBeInTheDocument();
  });

  it('displays error message and renders Retry Location button when error occurs', () => {
    const onRetry = vi.fn();
    render(
      <LocationControl
        status="denied"
        location={null}
        radiusKm={50}
        errorMessage="Location permission was denied. Please allow location access in your browser settings."
        onRequestLocation={vi.fn()}
        onRetryLocation={onRetry}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    expect(
      screen.getByText('Location permission was denied. Please allow location access in your browser settings.')
    ).toBeInTheDocument();

    const retryButton = screen.getByText('Retry Location');
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders and triggers "SRMIST Campus Pin (Manual)" button when onUseTestLocation is provided', () => {
    const onUseTest = vi.fn();
    render(
      <LocationControl
        status="idle"
        location={null}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
        onUseTestLocation={onUseTest}
      />
    );

    const testPinButton = screen.getByText(/SRMIST Campus Pin/);
    expect(testPinButton).toBeInTheDocument();
    fireEvent.click(testPinButton);
    expect(onUseTest).toHaveBeenCalledTimes(1);
  });

  it('renders and triggers "Center Map" button when onRecenterMap is provided and location exists', () => {
    const onRecenter = vi.fn();
    render(
      <LocationControl
        status="granted"
        location={{
          latitude: 13.0827,
          longitude: 80.2707,
          radiusKm: 50,
          source: 'gps'
        }}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
        onRecenterMap={onRecenter}
      />
    );

    const recenterButton = screen.getByText('Center Map');
    expect(recenterButton).toBeInTheDocument();
    fireEvent.click(recenterButton);
    expect(onRecenter).toHaveBeenCalledTimes(1);
  });

  it('renders HTTPS Required warning banner when accessed in an insecure context without location', () => {
    const originalSecure = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true, writable: true });

    render(
      <LocationControl
        status="idle"
        location={null}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
      />
    );

    expect(screen.getByText('HTTPS Required for Browser GPS Geolocation')).toBeInTheDocument();
    expect(screen.getByText(/Browser location access is restricted to secure contexts/)).toBeInTheDocument();

    Object.defineProperty(window, 'isSecureContext', { value: originalSecure, configurable: true, writable: true });
  });

  it('renders and triggers manual presets when onSetManualCoordinates is provided', () => {
    const onSetManual = vi.fn();
    render(
      <LocationControl
        status="idle"
        location={null}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
        onSetManualCoordinates={onSetManual}
      />
    );

    const tambaramBtn = screen.getByText('Tambaram Pin');
    expect(tambaramBtn).toBeInTheDocument();
    fireEvent.click(tambaramBtn);
    expect(onSetManual).toHaveBeenCalledWith(12.9249, 80.1, 'Tambaram');

    const marinaBtn = screen.getByText('Marina Beach Pin');
    expect(marinaBtn).toBeInTheDocument();
    fireEvent.click(marinaBtn);
    expect(onSetManual).toHaveBeenCalledWith(13.0475, 80.2824, 'Marina Beach');
  });

  it('allows custom coordinate input submission when valid coordinates are entered', () => {
    const onSetManual = vi.fn();
    render(
      <LocationControl
        status="idle"
        location={null}
        radiusKm={50}
        errorMessage={null}
        onRequestLocation={vi.fn()}
        onSetRadiusKm={vi.fn()}
        onClearLocation={vi.fn()}
        onSetManualCoordinates={onSetManual}
      />
    );

    const customBtn = screen.getByText('Custom Pin...');
    fireEvent.click(customBtn);

    const latInput = screen.getByPlaceholderText('12.8230');
    const lonInput = screen.getByPlaceholderText('80.0444');
    fireEvent.change(latInput, { target: { value: '13.0827' } });
    fireEvent.change(lonInput, { target: { value: '80.2707' } });

    const setPinBtn = screen.getByText('Set Pin');
    fireEvent.click(setPinBtn);

    expect(onSetManual).toHaveBeenCalledWith(13.0827, 80.2707, 'Custom Pin');
  });
});
