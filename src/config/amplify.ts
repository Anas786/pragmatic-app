import { Amplify } from 'aws-amplify';
import { ConsoleLogger, Hub } from 'aws-amplify/utils';
import {
  COGNITO_REGION,
  COGNITO_USER_POOL_ID,
  COGNITO_USER_POOL_CLIENT_ID,
  COGNITO_IDENTITY_POOL_ID,
} from '@env';
import { display, log } from 'src/utils/logger';

/**
 * Amplify configuration for AWS Cognito (ap-southeast-1).
 *
 * Docs: https://docs.amplify.aws/react-native/build-a-backend/auth/set-up-auth/
 *
 * Values are sourced from `.env` via `react-native-dotenv`. Fallbacks match the
 * production sign-in configuration so the app still boots if env injection fails.
 */
export const amplifyConfig = {
  Auth: {
    Cognito: {
      region: COGNITO_REGION || 'ap-southeast-1',
      userPoolId: COGNITO_USER_POOL_ID || 'ap-southeast-1_HvF8AdDd1',
      userPoolClientId:
        COGNITO_USER_POOL_CLIENT_ID || '27sa4crum5hb010qar9sja1l09',
      identityPoolId:
        COGNITO_IDENTITY_POOL_ID ||
        'ap-southeast-1:3e0c5cdc-877a-4db7-9a77-8f85c668acff',
      allowGuestAccess: false,
      loginWith: {
        username: true,
        email: true,
      },
    },
  },
} as const;

let configured = false;

export const configureAmplify = () => {
  if (configured) return;

  if (__DEV__) {
    // Surface every internal Amplify log line. Goes to console (and Reactotron
    // via console.tron piping) so SRP failures, network errors, etc. are
    // visible instead of swallowed inside "An unknown error has occurred".
    ConsoleLogger.LOG_LEVEL = 'DEBUG';
  }

  Amplify.configure(amplifyConfig as any);

  // Mirror Cognito Auth Hub events into Reactotron / console.
  Hub.listen('auth', ({ payload }) => {
    display(`auth:${payload.event}`, payload as unknown);
  });

  log('[amplify] configured', {
    region: amplifyConfig.Auth.Cognito.region,
    userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
    clientId: amplifyConfig.Auth.Cognito.userPoolClientId,
  });

  configured = true;
};
