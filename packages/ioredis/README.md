# Redis

```ts
// in services.ts
import * as IORedis from "@use-services/ioredis";

const options = {
  redis: {
    init: IORedis.init,
    args: {
      host: "0.0.0.0",
      password: "pass",
    },
    ctor: Redis,
  } as IORedis.Option<IORedis.Service>,
};

// usage
await srvs.redis.del("key")
```

