# Echo

```ts
// in services.ts
import * as Echo from "@use-services/echo";

import * as settings from "@/settings";

const options = {
  settings: {
    init: Echo.init,
    args: settings,
  } as Echo.Option<typeof settings>,
};

// in settings.ts
const settings = {
  app: "app",
  host: "0.0.0.0",
  port: 3000,
  prod: false,

};

export = settings;

// usage
srvs.settings.app
```
