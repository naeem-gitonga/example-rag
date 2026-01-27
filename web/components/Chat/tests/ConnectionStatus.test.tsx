import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../ConnectionStatus';

jest.mock('../Chat.module.scss', () => ({
  connectionStatus: 'connectionStatus',
  connected: 'connected',
  connecting: 'connecting',
  disconnected: 'disconnected',
  error: 'error',
  statusDot: 'statusDot',
  statusLabel: 'statusLabel',
}));

describe('ConnectionStatus', () => {
  it('should render connected status', () => {
    render(<ConnectionStatus status="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should render connecting status', () => {
    render(<ConnectionStatus status="connecting" />);
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should render disconnected status', () => {
    render(<ConnectionStatus status="disconnected" />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should render error status', () => {
    render(<ConnectionStatus status="error" />);
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('should apply correct CSS class for status', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    const statusElement = container.firstChild as HTMLElement;
    expect(statusElement.className).toContain('connected');
  });

  it('should render status dot element', () => {
    const { container } = render(<ConnectionStatus status="connected" />);
    const dot = container.querySelector('.statusDot');
    expect(dot).toBeInTheDocument();
  });
});
