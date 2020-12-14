import { ServiceOption, InitOption, STOP_KEY, eventNames } from "use-services";
import * as Bull from "bull";
import * as pEvent from "p-event";

import { Service as IORedisService } from "../ioredis/ioredis";
import * as IORedis from "ioredis";

export type Option<A, S extends Service<A>> = ServiceOption<Args<A>, S>;

export type Deps = [IORedisService];

export interface Args<A> {
  handlers: Handlers<A>;
  bullOptions?: Pick<Bull.QueueOptions, "defaultJobOptions" | "limiter" | "settings">,
}

export async function init<A, S extends Service<A>>(
  option: InitOption<Args<A>, S>,
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  return srv as S;
}

export class Service<A> {
  public queue: Bull.Queue;
  private redis: IORedisService;
  private args: Args<A>;
  private app: string;
  private srvName: string;
  constructor(option: InitOption<Args<A>, Service<A>>) {
    if (option.deps.length !== 1) {
      throw new Error("miss deps [redis]");
    }
    this.app = option.app;
    this.srvName = option.srvName;
    this.args = option.args;
    this.redis = option.deps[0];
    pEvent(option.emitter, eventNames.initAll).then(() => this.start());
  }

  public async [STOP_KEY]() {
    if (!this.queue) return;
    await this.queue.close();
  }

  async start() {
    this.queue = new Bull(this.srvName, {
      createClient: type => {
        if (type === "client") {
          return this.redis;
        }
        return new IORedis(this.redis.options);
      },
      prefix: this.app,
      ...(this.args.bullOptions || {}),
    });
    for (const name in this.args.handlers) {
      const handler = this.args.handlers[name];
      this.queue.process(name, handler.concurrency || 1, handler.fn);
    }
  }

  public async enqueue<K extends keyof A>(name: K, data: A[K], opts?: Bull.JobOptions & { force?: boolean }): Promise<Bull.Job> {
    const handler = this.args.handlers[name];
    if (opts.jobId && opts.force) {
      const job = await this.queue.getJob(opts.jobId);
      if (job) await job.remove();
    }
    return this.queue.add(name as string, data, { ...(handler.defaultOpts || {}), ...(opts || {}) });
  }

  public async dequeue<K extends keyof A>(name: K, id: string): Promise<boolean> {
    const job = await this.queue.getJob(id);
    if (!job) return false;
    await job.remove();
    return true;
  }
}

export type Handler = {
  concurrency?: number,
  defaultOpts?: Bull.JobOptions,
  fn: (job: any) => Promise<void> | void
};

export type Handlers<A> = {
  [k in keyof A]: Handler;
};
