jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import Geolocation from 'react-native-geolocation-service';
import useLocation from '../src/hooks/useLocation';

const HookProbe = ({ onState }) => {
  const state = useLocation();
  onState(state);
  return null;
};

describe('useLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should refresh location and update coordinates when geolocation succeeds', () => {
    let hookState;

    Geolocation.getCurrentPosition.mockImplementation((onSuccess) => {
      onSuccess({ coords: { latitude: 31.2, longitude: 121.5 } });
    });

    Geolocation.watchPosition.mockImplementation(() => 99);

    act(() => {
      TestRenderer.create(<HookProbe onState={(state) => { hookState = state; }} />);
    });

    expect(hookState.isLoading).toBe(false);
    expect(hookState.errorMessage).toBe('');
    expect(hookState.location).toEqual({ lat: 31.2, lng: 121.5 });
    expect(Geolocation.watchPosition).toHaveBeenCalledTimes(1);
  });

  test('should keep default location and expose error when geolocation fails', () => {
    let hookState;

    Geolocation.getCurrentPosition.mockImplementation((onSuccess, onError) => {
      onError({ message: 'GPS unavailable' });
    });

    Geolocation.watchPosition.mockImplementation(() => 100);

    act(() => {
      TestRenderer.create(<HookProbe onState={(state) => { hookState = state; }} />);
    });

    expect(hookState.isLoading).toBe(false);
    expect(hookState.location).toEqual({ lat: 30.2741, lng: 120.1551 });
    expect(hookState.errorMessage).toContain('GPS unavailable');
  });
});
