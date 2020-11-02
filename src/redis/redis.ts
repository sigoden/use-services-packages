import * as IORedis from "ioredis";
import { Config, Ctor, STOP_KEY } from "use-services";

export type Service<T extends Redis> = T;

export async function init<T extends Redis>(config: Config, args: IORedis.RedisOptions, ctor?: Ctor<T>): Promise<Service<T>> {
  const srv = new (ctor || Redis)(args);
  return new Promise<Service<T>>((resolve, reject) => {
    srv.once("connect", () => resolve(srv as Service<T>));
    srv.once("error", err => reject(err));
  });
}

export class Redis extends IORedis {
  public [STOP_KEY]() {
    return this.disconnect();
  }
}