import { ServiceOption, InitOption, createInitFn } from "use-services";
import Client from "@alicloud/pop-core";

export type Option<A, S extends Service<A>> = ServiceOption<Args<A>, S>;

export interface Args<A> {
  accessKeyId: string;
  accessKeySecret: string;
  defaultSignName: string;
  templates: Templates<A>;
}

const defaultConfig = {
  endpoint: "https://dysmsapi.aliyuncs.com",
  apiVersion: "2017-05-25",
};

export class Service<A> {
  private args: Args<A>;
  private client: Client;
  constructor(option: InitOption<Args<A>, Service<A>>) {
    this.args = option.args;
    const { accessKeyId, accessKeySecret } = this.args;
    this.client = new Client(
      Object.assign(defaultConfig, { accessKeyId, accessKeySecret })
    );
  }

  public async send<K extends keyof A>(
    name: K,
    phonenum: string | string[],
    data?: A[K]
  ): Promise<SendResult> {
    const { signName, templateCode } = this.args.templates[name];
    const body = {
      phoneNumbers:
        typeof phonenum === "object" ? phonenum.join(",") : phonenum,
      signName: signName || this.args.defaultSignName,
      templateCode: templateCode,
      templateParam: data && JSON.stringify(data),
    };
    return await this.client.request("SendSms", body, { method: "POST" });
  }

  public async sendBatch<K extends keyof A>(
    name: K,
    tasks: { phonenum: string; data?: A[K] }[]
  ): Promise<SendResult> {
    const { signName, templateCode } = this.args.templates[name];
    const body = {
      phoneNumberJson: [],
      signNameJson: [],
      templateParamJson: [],
    };
    for (const item of tasks) {
      if (!item.phonenum) {
        throw new Error("phonenum can not be empty");
      }
      body.phoneNumberJson.push(item.phonenum);
      if (item.data) {
        body.templateParamJson.push(item.data);
      }
      body.signNameJson.push(signName || this.args.defaultSignName);
    }
    const postBody = {
      templateCode,
      phoneNumberJson: JSON.stringify(body.phoneNumberJson),
      signNameJson: JSON.stringify(body.signNameJson),
      templateParamJson: JSON.stringify(body.templateParamJson),
    };
    return await this.client.request("SendBatchSms", postBody, {
      method: "POST",
    });
  }
}

export const init = createInitFn(Service);

export type Templates<A> = {
  [k in keyof A]: {
    signName?: string;
    templateCode: string;
    templateContent?: string;
  };
};

export interface SendResult {
  Message: string;
  RequestId: string;
  BizId: string;
  Code: string;
}
