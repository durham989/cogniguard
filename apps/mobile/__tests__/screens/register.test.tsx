// apps/mobile/__tests__/screens/register.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '@/app/(auth)/register';
import { api } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      register: jest.fn(),
    },
  },
}));

const mockSetAuth = jest.fn().mockResolvedValue(undefined);
jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector: any) =>
    selector({ setAuth: mockSetAuth })
  ),
}));

const mockRegister = api.auth.register as jest.Mock;

const fakeRegisterResponse = {
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  user: { id: 'u1', email: 'bob@example.com', name: 'Bob' },
};

// Helper to get the "Create Account" button (not the heading with the same text)
function getSubmitButton() {
  // getAllByText returns all matches; the button's Text is the last one since the
  // heading renders first in the tree.
  return screen.getAllByText('Create Account')[1];
}

describe('RegisterScreen', () => {
  it('renders all four form fields', () => {
    render(<RegisterScreen />);
    expect(screen.getByPlaceholderText('Jane Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('At least 8 characters')).toBeTruthy();
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('shows name error when name is empty', async () => {
    render(<RegisterScreen />);
    fireEvent.press(getSubmitButton());
    await waitFor(() => expect(screen.getByText('Name is required')).toBeTruthy());
  });

  it('shows email validation error for bad format', async () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), 'Bob');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'notvalid');
    fireEvent.press(getSubmitButton());
    await waitFor(() => expect(screen.getByText('Enter a valid email')).toBeTruthy());
  });

  it('shows error when password is too short', async () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), 'Bob Smith');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'bob@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'short');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'short');
    fireEvent.press(getSubmitButton());
    await waitFor(() =>
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy()
    );
  });

  it('shows error when passwords do not match', async () => {
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), 'Bob Smith');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'bob@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'password123');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'different1');
    fireEvent.press(getSubmitButton());
    await waitFor(() =>
      expect(screen.getByText('Passwords do not match')).toBeTruthy()
    );
  });

  it('calls api.auth.register with correct trimmed values', async () => {
    mockRegister.mockResolvedValue(fakeRegisterResponse);
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), '  Bob Smith  ');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'bob@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'securepass1');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'securepass1');
    fireEvent.press(getSubmitButton());
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Bob Smith',
        email: 'bob@example.com',
        password: 'securepass1',
      });
    });
  });

  it('calls setAuth with tokens and user on success', async () => {
    mockRegister.mockResolvedValue(fakeRegisterResponse);
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Jane Smith'), 'Bob Smith');
    fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), 'bob@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('At least 8 characters'), 'securepass1');
    fireEvent.changeText(screen.getByPlaceholderText('••••••••'), 'securepass1');
    fireEvent.press(getSubmitButton());
    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        'access-tok',
        'refresh-tok',
        fakeRegisterResponse.user,
      );
    });
  });

  it('shows "Sign in" link', () => {
    render(<RegisterScreen />);
    expect(screen.getByText('Sign in')).toBeTruthy();
  });
});
