import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: jest.fn(),
    },
  },
}));

const mockSetAuth = jest.fn().mockResolvedValue(undefined);
jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: any) =>
    selector({ setAuth: mockSetAuth })
  ),
}));

const mockLogin = api.auth.login as jest.Mock;

const fakeLoginResponse = {
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  user: { id: 'u1', email: 'alice@example.com', name: 'Alice' },
};

beforeEach(() => {
  mockSetAuth.mockResolvedValue(undefined);
});

describe('LoginScreen', () => {
  it('renders email, password inputs and Sign In button', () => {
    render(<LoginScreen />);
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows app title and subtitle', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Preventia')).toBeTruthy();
    expect(screen.getByText('Your cognitive wellness companion')).toBeTruthy();
  });

  it('shows email error when submitting empty email', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
    });
  });

  it('shows invalid email error for bad format', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'notanemail');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeTruthy();
    });
  });

  it('shows password error when password is empty', async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeTruthy();
    });
  });

  it('does not call api.auth.login when validation fails', async () => {
    render(<LoginScreen />);
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => expect(screen.getByText('Email is required')).toBeTruthy());
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls api.auth.login with trimmed lowercased email and password', async () => {
    mockLogin.mockResolvedValue(fakeLoginResponse);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), '  Alice@Example.COM  ');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
      });
    });
  });

  it('calls setAuth with tokens and user on success', async () => {
    mockLogin.mockResolvedValue(fakeLoginResponse);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'alice@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(screen.getByText('Sign In'));
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        'access-tok',
        'refresh-tok',
        fakeLoginResponse.user,
      );
    });
  });

  it('shows "Sign up" link', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Sign up')).toBeTruthy();
  });
});
