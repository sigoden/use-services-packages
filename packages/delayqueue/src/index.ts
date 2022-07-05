import {
  ServiceOption,
  InitOption,
  STOP_KEY,
  SERVICES_EVENTS,
} from "use-services";
import * as crypto from "crypto";
import { difference } from "lodash";
import pLimit from "p-limit";
import { Service as IORedisService } from "@use-services/ioredis";

export type Option<A, S extends Service<A>> = ServiceOption<Args<A>, S>;

export interface Args<A> {
  handlers: {
    [k in keyof A]: HandlerFn<A[k]>;
  };
  producers: {
    [k in keyof A]: ProducerOptions;
  };
  pollInterval?: number; // 轮询redis间隔,单位毫秒
}

export type Deps = [IORedisService];

const KEY_SEP = "@@@";

const TASK_SCRIPT = `
--[[
 Input:
      kEYS[1] ids key
      kEYS[2] pendingIds key
      KEYS[3] key
      KEYS[4] lock key
      KEYS[5] pending key
      ARGV[1] lock timeout
]]

if redis.call("exists", KEYS[4]) == 1 then
  return nil
end

redis.call("SET", KEYS[4], "", "PX", ARGV[1])
local score = redis.call("ZSCORE", KEYS[1], KEYS[3])
redis.call("ZADD", KEYS[2], score, KEYS[3])
redis.call("ZREM", KEYS[1], KEYS[3])
redis.call("RENAME", KEYS[3], KEYS[5])
return redis.call("GET", KEYS[5])
`;

export class Service<A> {
  private args: Args<A>;
  private redis: IORedisService;
  private timer: NodeJS.Timeout; // eslint-disable-line
  private ns: string;
  private initialized = false;
  constructor(option: InitOption<Args<A>, Service<A>>) {
    if (option.deps.length !== 1) {
      throw new Error("miss deps [redis]");
    }
    this.ns = option.app + ":" + option.srvName;
    this.redis = option.deps[0];
    this.redis.defineCommand("__delayqueueTask", {
      numberOfKeys: 5,
      lua: TASK_SCRIPT,
    });
    this.args = Object.assign(
      {
        pollInterval: 1000,
        ns: "delayqueue",
      },
      option.args
    );
    for (const key in this.args.producers) {
      this.args.producers[key] = Object.assign(
        { autoAck: true },
        this.args.producers[key]
      );
    }
    this._check();
  }

  public async start() {
    if (this.initialized) {
      return;
    }
    await this._runInterval();
    this.initialized = true;
  }

  public async [STOP_KEY]() {
    clearTimeout(this.timer);
  }

  public get idsKey() {
    return this._redisKey("ids");
  }

  public get pendingIdsKey() {
    return this._redisKey("pendingIds");
  }

  private _check() {
    const { producers = {}, handlers = {} } = this.args;
    const handlerNames = Object.keys(handlers);
    const producerNames = Object.keys(producers);
    const noHandlerNames = difference(producerNames, handlerNames);

    if (noHandlerNames.length > 0) {
      throw new DelayQueueError(
        `delayqueue: need handlers ${noHandlerNames.join(",")}`
      );
    }
  }

  /**
   * 获取pending的任务
   * @param timeMs - 早于这个时间的为死信,毫秒
   */
  public async getPendings(timeMs: number): Promise<PendingTask[]> {
    const values: string[] = await this.redis.zrangebyscore(
      this.pendingIdsKey,
      "-inf",
      timeMs,
      "WITHSCORES"
    );
    const result = [];
    for (let i = 0; i < values.length; i += 2) {
      const key = values[i];
      const deadAt = parseInt(values[i + 1]);
      const { id, name } = this.parseKey(key);
      result.push({ id, name, deadAt, key });
    }
    return result;
  }

  public async removePending(key: string) {
    await this.redis
      .multi()
      .zrem(this.pendingIdsKey, key)
      .del(this.pendingKey(key))
      .exec();
  }

  public async reclaimPending(
    key: string,
    delaySeconds: number
  ): Promise<boolean> {
    const { id, name } = this.parseKey(key);
    const dataRaw = await this.redis.get(this.pendingKey(key));
    if (!dataRaw) {
      return false;
    }
    let data;
    try {
      const value = JSON.parse(dataRaw);
      data = value.data;
    } catch (err) {
      return false;
    }
    await this.publish(name as any, delaySeconds, data, id);
    return true;
  }

  /**
   * 发布任务
   * @param name - 任务名
   * @param delaySeconds - 延时秒
   * @param data - 数据
   */
  public async publish<K extends keyof A>(
    name: K,
    delaySeconds: number,
    data: A[K],
    id?: string
  ) {
    const publishAt = Date.now();

    const scheduleAt = publishAt + delaySeconds * 1000;
    const dataStr = JSON.stringify({ data, publishAt });
    id = id || md5(dataStr);
    const key = this.key(name, id);
    await this.redis
      .multi()
      .zadd(this.idsKey, "" + scheduleAt, key)
      .setnx(key, dataStr)
      .exec();
    return id;
  }

  /**
   * 取消任务
   * @param name - 任务名
   * @param id - 任务ID
   */
  public async unpublish(name: keyof A, id: string): Promise<void> {
    const key = this.key(name, id);
    await this.redis.multi().zrem(this.idsKey, key).del(key).exec();
  }

  /**
   * 键名
   * @param name - 任务名
   * @param id - 任务ID
   */
  public key(name: keyof A, id: string) {
    return [this.ns, name, id].join(KEY_SEP);
  }

  public pendingKey(key: string) {
    return key + ":pending";
  }

  public lockedKey(key: string) {
    return key + ":locked";
  }

  /**
   * 解析键名
   * @param key - 键名
   */
  private parseKey(key: string) {
    const [_, name, id] = key.split(KEY_SEP);
    return { name, id };
  }

  private async _runInterval() {
    const { pollInterval, producers, handlers } = this.args;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this._runInterval();
    }, pollInterval);
    const { redis } = this;
    const queueValues = await redis.zrangebyscore(
      this.idsKey,
      "-inf",
      Date.now(),
      "WITHSCORES"
    );
    if (queueValues.length === 0) {
      return;
    }

    const taskMap = new Map();

    for (let i = 0; i < queueValues.length; i = i + 2) {
      const key: string = queueValues[i];
      const [, name, id] = key.split(KEY_SEP);
      const producer: ProducerOptions = producers[name];
      if (!producer) {
        // 忽略无意义 queue
        continue;
      }
      let tasks: any[];
      if (!taskMap.has(name)) {
        tasks = [];
        taskMap.set(name, tasks);
      } else {
        tasks = taskMap.get(name);
      }
      const task = async () => {
        const scheduleAt: string = queueValues[i + 1];
        const handler = handlers[name];
        const task = await (redis as any).__delayqueueTask(
          this.idsKey,
          this.pendingIdsKey,
          key,
          this.lockedKey(key),
          this.pendingKey(key),
          this.args.pollInterval * 1.1
        );
        if (task) {
          const { data = null, publishAt = -1 } = JSON.parse(task as any);
          let isAcked = false;
          const ack = () => {
            if (!isAcked) {
              this.redis
                .multi()
                .zrem(this.pendingIdsKey, key)
                .del(this.pendingKey(key))
                .exec();
              isAcked = true;
            }
          };
          const handleCtx = {
            name,
            scheduleAt: parseInt(scheduleAt),
            data,
            publishAt,
            id,
            ack,
          };
          try {
            await handler(handleCtx);
          } catch (err) {}
          if (producer.autoAck) ack();
        }
      };
      tasks.push(task);
    }
    Promise.all(
      Array.from(taskMap.keys()).map(async (name) => {
        const tasks = taskMap.get(name);
        if (producers[name].pLimit) {
          const limit = pLimit(producers[name].pLimit);
          await Promise.all(tasks.map((task) => limit(() => task())));
        } else {
          await Promise.all(tasks.map((task) => task()));
        }
      })
    );
  }

  private _redisKey(...args: string[]) {
    return this.ns + ":" + args.join(":");
  }
}

export async function init<A, S extends Service<A>>(
  option: InitOption<Args<A>, S>
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  option.emitter.on(SERVICES_EVENTS.INIT_END, () => srv.start());
  return srv as S;
}

export class DeeQueueNoHandlerError extends Error {
  public readonly ctx: Context<any>;
  constructor(ctx: Context<any>) {
    super(`delayqueue: ${ctx.name} cannot find handler`);
    this.ctx = ctx;
  }
}
export class DeeQueueHandleError extends Error {
  public readonly ctx: Context<any>;
  public readonly err: any;
  constructor(ctx: Context<any>, err: any) {
    super(`delayqueue: ${ctx.name} handle function rejected, err ${err}`);
    this.ctx = ctx;
    this.err = err;
  }
}

export class DeeQueueNoDataError extends Error {
  public readonly queue: string;
  public readonly key: string;
  public readonly scheduleAt: number;
  constructor(queue: string, key: string, scheduleAt: number) {
    super(`delayqueue: ${queue} have no data for ${key} at ${scheduleAt}`);
    this.key = key;
    this.scheduleAt = scheduleAt;
    this.queue = queue;
  }
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

export class DelayQueueError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "DelayQueueError";
  }
}

export interface Context<T> {
  name: string;
  publishAt: number;
  scheduleAt: number;
  id: string;
  data: T;
  ack: () => void;
}

export interface PendingTask {
  id: string;
  name: string;
  deadAt: number;
  key: string;
}

export type HandlerFn<T> = (ctx: Context<T>) => Promise<void>;

export interface ProducerOptions {
  pLimit?: number;
  autoAck?: boolean;
}
