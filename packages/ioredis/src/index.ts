import IORedis, { RedisOptions } from "ioredis";
import { ServiceOption, InitOption, STOP_KEY } from "use-services";

export type Args = RedisOptions;
export type Option<S extends Service> = ServiceOption<Args, S>;

export class Service extends IORedis {
  public [STOP_KEY]() {
    return this.disconnect();
  }
}

export async function init<S extends Service>(
  option: InitOption<Args, S>
): Promise<S> {
  const srv = new (option.ctor || Service)(option.args);
  return new Promise((resolve, reject) => {
    srv.once("connect", () => resolve(srv as S));
    srv.once("error", (err) => reject(err));
  });
}
