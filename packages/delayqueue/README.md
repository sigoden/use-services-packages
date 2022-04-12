# Delayqueue

```ts
// in service.ts
import * as DelayQueue from "@use-services/delayqueue";
import * as handlersDelayQueue from "@/handlersDelayQueue";
import { DelayQueueData } from "@/type";

const options = {
  delayqueue: {
    init: DelayQueue.init,
    args: {
      pollInterval: 1000,
      handlers: handlersDelayQueue,
      producers: {
        dealPingPayOrder: {},
      },
    },
    deps: ["redis"],
  } as DelayQueue.Option<DelayQueueData, DelayQueue.Service<DelayQueueData>>,
}

// in type.ts
export interface DelayQueueData {
  dealPingPayOrder: {
    payId: string;
  }
}

export type PropType<X, Y extends keyof X> = X[Y];

// in handlersDelayQueue.ts
import { Context } from "@@use-services/delayqueue";
import { PropType, DelayQueueData } from "@/type";
export async function dealPingPayOrder(ctx: Context<PropType<DelayQueueData, "dealPingPayOrder">>) {}

// usage
srvs.delayqueue.publish("dealPingPayOrder", 60, { payId });
```