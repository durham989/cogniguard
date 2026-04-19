import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ExerciseResultBanner } from '@/components/ExerciseResultBanner';

const baseResult = {
  rawScore: 8,
  normalizedScore: 80,
  feedback: 'Excellent recall!',
  domain: 'memory',
};

describe('ExerciseResultBanner', () => {
  it('renders the domain label', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('Memory Exercise')).toBeTruthy();
  });

  it('renders normalizedScore', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('80')).toBeTruthy();
  });

  it('renders feedback text', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('Excellent recall!')).toBeTruthy();
  });

  it('renders rawScore', () => {
    render(<ExerciseResultBanner result={baseResult} onDismiss={jest.fn()} />);
    expect(screen.getByText('Raw: 8')).toBeTruthy();
  });

  it('calls onDismiss when close button is pressed', () => {
    const onDismiss = jest.fn();
    render(<ExerciseResultBanner result={baseResult} onDismiss={onDismiss} />);
    fireEvent.press(screen.getByText('close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('score ring text is green for score >= 70', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, normalizedScore: 75 }} onDismiss={jest.fn()} />);
    const scoreText = screen.getByText('75');
    const style = scoreText.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.color).toBe('#30d158');
  });

  it('score ring text is yellow for score >= 40 and < 70', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, normalizedScore: 55 }} onDismiss={jest.fn()} />);
    const scoreText = screen.getByText('55');
    const style = scoreText.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.color).toBe('#ffd60a');
  });

  it('score ring text is red for score < 40', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, normalizedScore: 30 }} onDismiss={jest.fn()} />);
    const scoreText = screen.getByText('30');
    const style = scoreText.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.color).toBe('#ff453a');
  });

  it('falls back to raw domain key for unknown domains', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, domain: 'unknown_domain' }} onDismiss={jest.fn()} />);
    expect(screen.getByText('unknown_domain Exercise')).toBeTruthy();
  });

  it('renders processing_speed domain label correctly', () => {
    render(<ExerciseResultBanner result={{ ...baseResult, domain: 'processing_speed' }} onDismiss={jest.fn()} />);
    expect(screen.getByText('Processing Speed Exercise')).toBeTruthy();
  });
});
