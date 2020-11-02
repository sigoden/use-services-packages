import * as IORedis from "ioredis";
import { Config, Ctor, STOP_KEY } from "use-services";

export type Service<S extends Redis> = S;
export type Args = IORedis.RedisOptions;

export async function init<S extends Redis>(
  _config: Config, 
  args: Args, 
  ctor?: Ctor<S>
): Promise<Service<S>> {
  const srv = new (ctor || Redis)(args);
  return new Promise((resolve, reject) => {
    srv.once("connect", () => resolve(srv as Service<S>));
    srv.once("error", err => reject(err));
  });
}

export class Redis extends IORedis {
  public [STOP_KEY]() {
    return this.disconnect();
  }
}