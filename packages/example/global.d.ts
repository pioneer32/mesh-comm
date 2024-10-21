declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, any>;
  export default component;
}

declare module 'single-spa-html' {
  const module: any;
  export default module;
}

declare var System: System;
