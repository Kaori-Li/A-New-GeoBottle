import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import useGeofencing from '../src/hooks/useGeofencing';

const Probe = ({ payload, onResult }) => {
  const result = useGeofencing(payload);
  onResult(result);
  return null;
};

describe('useGeofencing', () => {
  test('should mark nearby bottle as pickup candidate', () => {
    let hookResult;

    act(() => {
      TestRenderer.create(
        <Probe
          payload={{
            location: { lat: 30, lng: 120 },
            bottles: [
              { id: 'near', distanceMeters: 20 },
              { id: 'far', distanceMeters: 120 },
            ],
          }}
          onResult={(result) => {
            hookResult = result;
          }}
        />,
      );
    });

    expect(hookResult.enrichedBottles).toHaveLength(2);
    expect(hookResult.pickupCandidates.map((item) => item.id)).toEqual(['near']);
  });
});
