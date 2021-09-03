import { ServiceOption, InitOption, STOP_KEY, eventNames } from "use-services";
import Bull from "bull";
import pEvent from "p-event";
import { Service as IORedisService  } from "../ioredis/ioredis";
import { Service as WinstonService  } from "../winston/winston";
import IORedis from "ioredis";

export type Option<A extends Handlers, S extends Service<A>> = ServiceOption<Args<A>, S>;

export type Handlers = {[k: string]: () => Promise<any>};
export interface Args<A extends Handlers> {
  crons: {
    [k in keyof A]: string;
  };
  handlers: A;
  bullOptions?: Pick<Bull.QueueOptions, "defaultJobOptions" | "limiter" | "settings">,
}

export type Deps = [IORedisService, WinstonService];

export async function init<A extends Handlers, S extends Service<A>>(
  option: InitOption<Args<A>, S>,
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  return srv as S;
}

export class Service<A extends Handlers> {
  private queue: Bull.Queue;
  private redis: IORedisService;
  private args: Args<A>;
  private logger: WinstonService;
  private app: string;
  private srvName: string;
  constructor(option: InitOption<Args<A>, Service<A>>) {
    if (option.deps.length !== 2) {
      throw new Error("miss deps [redis, logger]");
    }
    this.app = option.app;
    this.srvName = option.srvName;
    this.args = option.args;
    this.redis = option.deps[0];
    this.logger = option.deps[1];
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
    const jobs = await this.queue.getRepeatableJobs();
    const { handlers, crons } = this.args;
    await Promise.all(Object.keys(crons).map(async name => {
      this.queue.process(name, () => {
        if (handlers[name]) {
          this.wrapCall(name, handlers[name]);
        } else {
          this.logger.error("miss handler", { topic: `cron.${name}` });
        }
      });
      const idx = jobs.findIndex(v => v.name === name);
      if (idx > -1) {
        const job = jobs.splice(idx, 1)[0];
        if (job.cron !== crons[name]) {
          await this.queue.removeRepeatableByKey(job.key);
          await this.addCron(name);
        }
      } else {
        await this.addCron(name);
      }
    }));
    await Promise.all(jobs.map(job => this.queue.removeRepeatableByKey(job.key)));
  }

  addCron(name: string) {
    return this.queue.add(
      name,
      {},
      {
        jobId: name,
        repeat: { cron: this.args.crons[name] },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async wrapCall(name: string, call: () => Promise<any>) {
    try {
      await call();
    } catch (err) {
      this.logger.error(err, {
        topic: "cron." + name,
      });
    }
  }
}
