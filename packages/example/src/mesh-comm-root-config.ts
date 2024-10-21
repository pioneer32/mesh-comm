import { registerApplication, start, LifeCycles } from 'single-spa';

// React Microfrontend
registerApplication({
  name: '@mesh-comm/react-mfe',
  app: () => System.import<LifeCycles>('@mesh-comm/react-mfe'),
  activeWhen: () => true,
});

// Vue Microfrontend
registerApplication({
  name: '@mesh-comm/vue-mfe',
  app: () => System.import<LifeCycles>('@mesh-comm/vue-mfe'),
  activeWhen: () => true,
});

// Vanilla Microfrontend
registerApplication({
  name: '@mesh-comm/vanilla-mfe',
  app: () => System.import<LifeCycles>('@mesh-comm/vanilla-mfe'),
  activeWhen: () => true,
});

start();
