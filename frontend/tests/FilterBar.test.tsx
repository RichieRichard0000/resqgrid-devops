import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../src/components/FilterBar.js';

describe('FilterBar Component', () => {
  it('renders all hazard category buttons', () => {
    render(
      <FilterBar
        searchQuery=""
        selectedType=""
        selectedSeverity=""
        selectedSource="all"
        onSearchChange={vi.fn()}
        onTypeChange={vi.fn()}
        onSeverityChange={vi.fn()}
        onSourceChange={vi.fn()}
      />
    );

    expect(screen.getByText('All Hazards')).toBeInTheDocument();
    expect(screen.getByText('Floods')).toBeInTheDocument();
    expect(screen.getByText('Earthquakes')).toBeInTheDocument();
    expect(screen.getByText('Severe Weather')).toBeInTheDocument();
    expect(screen.getByText('Emergencies')).toBeInTheDocument();
  });

  it('triggers onTypeChange when hazard button is clicked', () => {
    const onTypeChange = vi.fn();
    render(
      <FilterBar
        searchQuery=""
        selectedType=""
        selectedSeverity=""
        selectedSource="all"
        onSearchChange={vi.fn()}
        onTypeChange={onTypeChange}
        onSeverityChange={vi.fn()}
        onSourceChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Floods'));
    expect(onTypeChange).toHaveBeenCalledWith('flood');
  });

  it('triggers onSourceChange when Official or Simulated toggle clicked', () => {
    const onSourceChange = vi.fn();
    render(
      <FilterBar
        searchQuery=""
        selectedType=""
        selectedSeverity=""
        selectedSource="all"
        onSearchChange={vi.fn()}
        onTypeChange={vi.fn()}
        onSeverityChange={vi.fn()}
        onSourceChange={onSourceChange}
      />
    );

    fireEvent.click(screen.getByText('Official Feeds'));
    expect(onSourceChange).toHaveBeenCalledWith('official');

    fireEvent.click(screen.getByText('Simulated Drills'));
    expect(onSourceChange).toHaveBeenCalledWith('simulated');
  });

  it('triggers onSearchChange when user types in search box', () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar
        searchQuery=""
        selectedType=""
        selectedSeverity=""
        selectedSource="all"
        onSearchChange={onSearchChange}
        onTypeChange={vi.fn()}
        onSeverityChange={vi.fn()}
        onSourceChange={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText(/search incident/i);
    fireEvent.change(input, { target: { value: 'chennai' } });
    expect(onSearchChange).toHaveBeenCalledWith('chennai');
  });
});
