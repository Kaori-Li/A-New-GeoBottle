jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => {}),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => {}),
}));

jest.mock('../src/services/apiClient', () => ({
  post: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../src/services/apiClient';
import { login, logout } from '../src/services/authService';

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('login should persist token when backend returns token', async () => {
    apiClient.post.mockResolvedValue({ data: { token: 'jwt-token', user: { id: 'u1' } } });

    const result = await login('alice', '123456');

    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { username: 'alice', password: '123456' });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userToken', 'jwt-token');
    expect(result.token).toBe('jwt-token');
  });

  test('logout should remove token from storage', async () => {
    await logout();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userToken');
  });
});
