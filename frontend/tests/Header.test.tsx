import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../src/components/Header.js';

describe('Header Component', () => {
  it('renders application branding and project subtitle', () => {
    render(
      <Header
        connectionStatus="connected"
        currentUser={null}
        onOpenSimulate={vi.fn()}
        onOpenAuth={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('ResQGrid')).toBeInTheDocument();
    expect(screen.getByText('Phase 1 Foundation')).toBeInTheDocument();
  });

  it('renders "Real-Time Connected" badge when connected', () => {
    render(
      <Header
        connectionStatus="connected"
        currentUser={null}
        onOpenSimulate={vi.fn()}
        onOpenAuth={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('Real-Time Connected')).toBeInTheDocument();
  });

  it('renders "Connecting Engine..." badge when connecting', () => {
    render(
      <Header
        connectionStatus="connecting"
        currentUser={null}
        onOpenSimulate={vi.fn()}
        onOpenAuth={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('Connecting Engine...')).toBeInTheDocument();
  });

  it('renders "Service Offline" badge when disconnected', () => {
    render(
      <Header
        connectionStatus="disconnected"
        currentUser={null}
        onOpenSimulate={vi.fn()}
        onOpenAuth={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByText('Service Offline')).toBeInTheDocument();
  });

  it('triggers onOpenSimulate when Simulate Drill button is clicked', () => {
    const onOpenSimulate = vi.fn();
    render(
      <Header
        connectionStatus="connected"
        currentUser={null}
        onOpenSimulate={onOpenSimulate}
        onOpenAuth={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Simulate Drill'));
    expect(onOpenSimulate).toHaveBeenCalledTimes(1);
  });
});
