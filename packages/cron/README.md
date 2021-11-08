```ts
import * as Cron from "@/lib/services/cron";
import * as handlersCron from "@/handlersCron";

const options = {
  cron: {
    init: Cron.init,
    args: {
      pollInterval: 500,
      handlers: handlersCron,
      crons: {
        everyFiveMinite: "*/5 * * * *",
      },
    },
    deps: ["redis"],
  } as Cron.Option<typeof handlersCron, Cron.Service<typeof handlersCron>>,
}

// in @/handlersCron.ts
import { Context } from "@/lib/services/cron";

export async function everyFiveMinite(ctx: Context) {

}
```
