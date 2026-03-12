jest.mock('../src/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

import apiClient from '../src/services/apiClient';
import { getNearbyBottles, tossBottle } from '../src/services/bottleService';

describe('bottleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getNearbyBottles should call nearby api with query params', async () => {
    apiClient.get.mockResolvedValue({ data: { success: true, data: [] } });

    await getNearbyBottles({ lng: 120, lat: 30, radius: 500 });

    expect(apiClient.get).toHaveBeenCalledWith('/bottles/nearby', {
      params: { lng: 120, lat: 30, radius: 500 },
    });
  });

  test('tossBottle should normalize coordinates to numbers', async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });

    await tossBottle({ content: 'hello', lng: '120.1', lat: '30.2', ttlMinutes: 60 });

    expect(apiClient.post).toHaveBeenCalledWith('/bottles/toss', {
      content: 'hello',
      ttlMinutes: 60,
      location: {
        type: 'Point',
        coordinates: [120.1, 30.2],
      },
    });
  });
});
