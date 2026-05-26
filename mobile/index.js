import { registerRootComponent } from 'expo';
import { enableFreeze, enableScreens } from 'react-native-screens';
import * as Sentry from '@sentry/react-native';

import App from './App';

Sentry.init({
  dsn: 'https://b95dd8161658a7686c359154ffe4ceec@o4511457706704896.ingest.de.sentry.io/4511457799110736',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
});

enableScreens(true);
enableFreeze(true);

registerRootComponent(Sentry.wrap(App));
