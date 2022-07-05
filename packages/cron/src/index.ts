import {
  ServiceOption,
  InitOption,
  STOP_KEY,
  SERVICES_EVENTS,
} from "use-services";
import * as cronParser from "cron-parser";
import { Service as IORedisService } from "@use-services/ioredis";

export type Option<A, S extends Service<A>> = ServiceOption<Args<A>, S>;

export interface Args<A> {
  pollInterval?: number; // 轮询redis间隔,单位豪秒
  crons: { [k in keyof A]: string };
  handlers: A;
}

export type Deps = [IORedisService];

const LOCK_SCRIPT = `
  if redis.call("exists", KEYS[1]) == 1 then
    return 0
  end
  redis.call("set", KEYS[1], ARGV[1], "PX", ARGV[2])
  return 1
`;

export class Service<A> {
  private args: Args<A>;
  private redis: IORedisService;
  private initialized = false;
  private ns: string;
  private timer: NodeJS.Timeout; // eslint-disable-line
  constructor(option: InitOption<Args<A>, Service<A>>) {
    if (option.deps.length !== 1) {
      throw new Error("miss deps [redis]");
    }
    this.ns = option.app + ":" + option.srvName;
    this.redis = option.deps[0];
    this.redis.defineCommand("__cronLock", {
      numberOfKeys: 1,
      lua: LOCK_SCRIPT,
    });
    this.args = Object.assign(
      {
        pollInterval: 500,
      },
      option.args
    );
    this._checkHandlers();
  }

  public async start() {
    if (this.initialized) {
      return;
    }
    this._addInterval();
    await this._runinterval();
    this.initialized = true;
  }

  public async [STOP_KEY]() {
    clearTimeout(this.timer);
  }

  private _addInterval() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this._runinterval(), this.args.pollInterval);
  }

  private async _runinterval() {
    this._addInterval();
    const keyLock = this._redisKey("lock");

    // 只有一个进程获得了锁
    const result = await (this.redis as any).__cronLock(
      keyLock,
      "",
      this.args.pollInterval
    );
    if (result === 0) return;

    const now = Date.now();
    const sec = Math.floor(Date.now() / 1000);
    const keyLastRunAts = this._redisKey("lastRunAts");
    const lastRunAtsRaw = (await this.redis.get(keyLastRunAts)) || "{}";
    const lastRunAts = JSON.parse(lastRunAtsRaw);
    Object.keys(this.args.crons).forEach(
      (name) => lastRunAts[name] || (lastRunAts[name] = "" + sec)
    );
    const schedules = await this._getSchedules(now, lastRunAts);
    schedules.map(async (ctx) => {
      if (ctx.runAts.length > 0) {
        lastRunAts[ctx.name] = Math.floor(
          ctx.runAts[ctx.runAts.length - 1].getTime() / 1000
        );
        const handler = this.args.handlers[ctx.name];
        if (handler) await handler(ctx);
      }
    });
    await this.redis.set(keyLastRunAts, JSON.stringify(lastRunAts));
  }

  private _redisKey(...args: string[]) {
    return this.ns + ":" + args.join(":");
  }

  private async _getSchedules(
    now: number,
    lastRunAts: { [k: string]: string }
  ): Promise<Context[]> {
    const result = [];
    for (const name in this.args.crons) {
      const cron = this.args.crons[name];
      const currentDate = new Date(parseInt(lastRunAts[name]) * 1000);
      const interval = cronParser.parseExpression(cron, {
        currentDate: currentDate,
      });
      const runAts = [];
      while (true) {
        const obj = interval.next();
        if (obj.getTime() > now) {
          result.push({ name, cron, runAts, nextRunAt: obj });
          break;
        }
        runAts.push(obj);
      }
    }
    return result;
  }

  private _checkHandlers() {
    const { crons, handlers } = this.args;
    const misHandlers = [];
    Object.keys(crons).forEach((key) => {
      if (!handlers[key]) {
        misHandlers.push(key);
      }
    });
    if (misHandlers.length > 0) {
      throw new Error(`cron: miss handlers ${misHandlers.join(",")}`);
    }
  }
}

export async function init<A, S extends Service<A>>(
  option: InitOption<Args<A>, S>
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  option.emitter.on(SERVICES_EVENTS.INIT_END, () => srv.start());
  return srv as S;
}

export type Context = {
  name: string;
  cron: string;
  nextRunAt: Date;
  runAts: Date[];
};
