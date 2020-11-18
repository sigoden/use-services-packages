```ts
// in services.ts
import * as Cron from "@/lib/services/cron";
import * as handlersCron from "@/handlersCron";

const options = {
  cron: {
    init: Cron.init,
    args: {
      handlers: handlersCron,
      crons: {
        every3Minute: "0 0 * * * *",
      },
    },
    deps: ["redis", "logger"],
  } as Cron.Option<typeof handlersCron, Cron.Service<typeof handlersCron>>,
};

// in handlersCron.ts

export async function every3Minute() {

}
```