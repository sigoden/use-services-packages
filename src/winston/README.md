```ts
// in services.ts
import * as Winston from "@/lib/services/winston";

const options = {
  logger: {
    init: Winston.init,
    args: {
      console: {
        level: "debug",
      },
    },
  } as Winston.Option<Winston.Service>,
};

// usage
await srvs.logger.error(err, { topic: "Api" });
```


