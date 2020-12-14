```ts
// in services.ts
import * as TaskQueue from "@/lib/services/taskqueue";
import * as handlersTaskQueue from "@/handlersTaskQueue";


const options = {
  taskqueue: {
    init: TaskQueue.init,
    deps: ["redis"],
    args: {
      handlers: handlersTaskQueue,
    },
  } as TaskQueue.Option<TaskQueueInputs, TaskQueue.Service<TaskQueueInputs>>,
};

// in type.ts
export interface TaskQueueData {
  heartBeat: {
    key: string;
  },
}

export type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];



// in handlersTaskQueue.ts

import * as Bull from "bull";
import { Handler } from "@/lib/services/taskqueue";
import { TaskQueueInputs, PropType } from "@/type";

export const heartBeat: Handler = {
  concurrency: 99,
  defaultOpts: {
    removeOnComplete: true,
    removeOnFail: true,
  },
  async fn(job: Bull.Job<PropType<TaskQueueData, "heartBeat">>) {
  },
};
```
