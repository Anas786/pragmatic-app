import Reactotron from 'reactotron-react-native';

const reactotron = Reactotron.configure({ name: 'PragmaticEnergySolution' })
  .useReactNative()
  .connect();

// Make Reactotron available globally as `console.tron` so any module can do
// `console.tron?.log(...)` / `console.tron?.error(...)` without importing it.
declare global {
  // eslint-disable-next-line no-var
  var tron: typeof Reactotron | undefined;

  interface Console {
    tron?: typeof Reactotron;
  }
}

(console as any).tron = Reactotron;
(globalThis as any).tron = Reactotron;

Reactotron.clear?.();
Reactotron.log?.('Reactotron connected');

export default reactotron;
