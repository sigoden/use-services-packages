import { ServiceOption, InitOption } from "use-services";
import { Service as IORedisService } from "@use-services/ioredis";

export type Option<A, S extends Service<A>> = ServiceOption<A, S>;

export type Deps = [IORedisService];

export class Service<A> {
  private data: A;
  private redis: IORedisService;
  private modifyAt = -1;
  private dateKey: string;
  private dataKey: string;
  constructor(option: InitOption<A, Service<A>>) {
    this.data = option.args;
    this.redis = option.deps[0];
    const ns = option.app + ":" + option.srvName;
    this.dateKey = ns + ":" + "date";
    this.dataKey = ns + ":" + "data";
  }

  public async save(change: Partial<A>) {
    const data = { ...this.data, ...change };
    const modifyAt = Date.now();
    await this.redis
      .multi()
      .set(this.dateKey, modifyAt)
      .set(this.dataKey, JSON.stringify(data))
      .exec();
    this.data = data;
    this.modifyAt = modifyAt;
  }

  public async load() {
    const modifyAt = parseInt(await this.redis.get(this.dateKey));
    if (modifyAt !== this.modifyAt) {
      const data = JSON.parse(await this.redis.get(this.dataKey)) || {};
      this.data = { ...this.data, ...data };
      this.modifyAt = modifyAt;
    }
    return this.data;
  }
}

export async function init<A, S extends Service<A>>(
  option: InitOption<A, S>
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  await srv.load();
  return srv as S;
}
