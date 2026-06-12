/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

// The app schedules real timers on mount (splash minimum-duration timer,
// skeleton loops). Fake timers keep the test from leaking open handles.
jest.useFakeTimers();

it('renders correctly', () => {
  let tree!: renderer.ReactTestRenderer;

  // act() flushes mount + passive effects inside the test. Without it the
  // effects run on a setImmediate AFTER Jest tears down the module registry
  // and crash the worker.
  renderer.act(() => {
    tree = renderer.create(<App />);
  });

  renderer.act(() => {
    tree.unmount();
  });
});
