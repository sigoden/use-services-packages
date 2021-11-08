import { ServiceOption, InitOption } from "use-services";
import OSS from "ali-oss";

export type Option<S extends Service> = ServiceOption<Args, S>;

export interface Args {
  oss?: OSS.Options;
  sts?: {
    endpoint?: string;
    arn: string;
    policy: any;
    session: string;
    expiration?: number;
    options?: {
      timeout?: number;
    };
  };
}

export async function init<S extends Service>(
  option: InitOption<Args, S>,
): Promise<S> {
  const srv = new (option.ctor || Service)(option);
  return srv as S;
}

export interface STSData {
  bucket: string;
  region: string;
  credentials: Credentials;
}

export interface Credentials {
  AccessKeyId: string;
  AccessKeySecret: string;
  Expiration: string;
  SecurityToken: string;
}

export class Service {
  public oss: OSS;
  private args: Args;
  private sts: any;
  constructor(option: InitOption<Args, Service>) {
    this.args = option.args;
    const { accessKeyId, accessKeySecret } = this.args.oss;
    const client = new OSS(this.args.oss);

    const sts = new (<any>OSS).STS({
      accessKeyId,
      accessKeySecret,
      endpoint: this.args.sts.endpoint,
    });

    this.oss = client;
    this.sts = sts;
  }

  public async getStsData(sessionName?: string) {
    const { arn, policy, expiration = 15 * 60, session } = this.args.sts;
    const { credentials } = await this.sts.assumeRole(arn, policy, expiration, sessionName || session);
    return <STSData>{
      region: this.args.oss.region,
      bucket: this.args.oss.bucket,
      credentials,
    };
  }
}
