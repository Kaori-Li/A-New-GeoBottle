jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

jest.mock('../src/services/apiClient', () => ({
  post: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../src/services/apiClient';
import { login, logout, getStoredToken } from '../src/services/authService';

describe('auth journey e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete login -> read token -> logout flow', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        token: 'e2e-token',
        user: { id: 'u_e2e', username: 'e2e_user' },
      },
    });

    await login('e2e_user', 'password123');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      username: 'e2e_user',
      password: 'password123',
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userToken', 'e2e-token');

    AsyncStorage.getItem.mockResolvedValueOnce('e2e-token');
    const token = await getStoredToken();
    expect(token).toBe('e2e-token');

    await logout();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userToken');
  });
});
