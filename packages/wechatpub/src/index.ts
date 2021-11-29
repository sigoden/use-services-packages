/* eslint-disable camelcase */
import { ServiceOption, InitOption, createInitFn } from "use-services";
import axios from "axios";
import * as crypto from "crypto";

export type Option<S extends Service> = ServiceOption<Args, S>;

export interface Args {
  appId: string;
  secret: string;
  token?: string;
  timeout?: number;
  encodingAESKey?: string;
}

export class Service {
  public readonly args: Args;
  constructor(option: InitOption<Args, Service>) {
    this.args = option.args;
    this.args.timeout = this.args.timeout || 2500;
  }

  public async code2AuthToken(code: string): Promise<AuthAccessToken> {
    const { appId, secret, timeout } = this.args;
    const resp = await axios({
      url: " https://api.weixin.qq.com/sns/oauth2/access_token",
      timeout,
      params: {
        appid: appId,
        secret,
        code,
        grant_type: "authorization_code",
      },
    });
    return resp.data;
  }

  public async authToken2UserInfo(
    openId: string,
    accessToken: string
  ): Promise<UserInfo> {
    const resp = await axios({
      url: "https://api.weixin.qq.com/sns/userinfo",
      timeout: this.args.timeout,
      params: {
        openid: openId,
        access_token: accessToken,
        lang: "zh_CN",
      },
    });
    return resp.data;
  }

  public async getAccessToken() {
    const { appId, secret, timeout } = this.args;
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/token",
      timeout,
      params: {
        appid: appId,
        secret,
        grant_type: "client_credential",
      },
    });
    return resp.data;
  }

  public async getUserInfo(accessToken: string, openId: string) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/user/info",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
        openid: openId,
      },
    });
    return resp.data;
  }

  public async createQr(
    accessToken: string,
    sceneStr: string,
    expires: number
  ) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/qrcode/create",
      method: "post",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
      },
      data: JSON.stringify({
        action_name: "QR_STR_SCENE",
        expire_seconds: expires,
        action_info: {
          scene: {
            scene_str: sceneStr,
          },
        },
      }),
    });
    return resp.data;
  }

  public async showQr(ticket: string) {
    const resp = await axios({
      url: "https://mp.weixin.qq.com/cgi-bin/showqrcode",
      timeout: this.args.timeout,
      params: {
        ticket,
      },
    });
    return resp.data;
  }

  public async sendCustomerMessage(accessToken: string, msg: CustomerMessage) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/message/custom/send",
      method: "post",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
      },
      data: JSON.stringify(msg),
    });
    return resp.data;
  }

  public async sendTemplateMessage(accessToken: string, msg: TemplateMessage) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/message/template/send",
      method: "post",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
      },
      data: JSON.stringify(msg),
    });
    return resp.data;
  }

  public checkSignature(signature: string, timestamp: string, nonce: string) {
    const { token } = this.args;
    if (!token) {
      throw new Error("args token is required");
    }
    const key = [token, timestamp, nonce].sort().join("");
    return sha1(key) === signature;
  }

  public async getJSTicket(accessToken: string) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/ticket/getticket",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
        type: "jsapi",
      },
    });
    return resp.data;
  }

  private checkError(name: string, err: Error, body: any) {
    if (err) {
      return new Error(`wxpub ${name} request failed, err ${err.message}`);
    }
    if (body.errcode) {
      return new WechatPubError(name, body);
    }
  }
}

export const init = createInitFn(Service);

export interface ErrorData {
  errcode: string;
  errmsg: string;
}

export class WechatPubError extends Error {
  public readonly fn: string;
  public readonly data: ErrorData;
  constructor(fn: string, data: ErrorData) {
    super(`wxpub ${fn} response with errcode ${data.errcode}, ${data.errmsg}`);
    this.fn = fn;
    this.data = data;
  }
}

export interface AuthAccessToken {
  access_token: string;
  expires_in: string;
  refresh_token: string;
  openid: string;
}

export interface UserInfo {
  openid: string;
  nickname: string;
  sex: string;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string;
  unionid: string;
}

export interface UserInfo2 {
  openid: string;
  nickname: string;
  sex: string;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  language: string;
  unionid: string;
  subscribe: number;
  subscribe_time: number;
  remark: string;
  groupid: number;
  tagid_list: number[];
  subscribe_scene: string;
  qr_scene: number;
  qr_scene_str: string;
}

export interface CreateQr {
  ticket: string;
  expire_seconds: number;
  url: string;
}

export interface AccessToken {
  access_token: string;
  expires_in: number;
}

export type CustomerMessage =
  | CustomerMessageText
  | CustomerMessageImage
  | CustomerMessageVoice
  | CustomerMessageVideo
  | CustomerMessageMusic
  | CustomerMessageNews
  | CustomerMessageMpnews
  | CustomerMessageWxcard
  | CustomerMessageMiniprogrampage;

export interface CustomerMessageText {
  touser: string;
  msgtype: "text";
  text: {
    content: string;
  };
}
export interface CustomerMessageImage {
  touser: string;
  msgtype: "image";
  image: {
    media_id: string;
  };
}

export interface CustomerMessageVoice {
  touser: string;
  msgtype: "image";
  voice: {
    media_id: string;
  };
}

export interface CustomerMessageVideo {
  touser: string;
  msgtype: "video";
  video: {
    media_id: string;
    thumb_media_id: string;
    title: string;
    description: string;
  };
}

export interface CustomerMessageMusic {
  touser: string;
  msgtype: "music";
  music: {
    title: string;
    description: string;
    musicurl: string;
    hqmusicurl: string;
    thumb_media_id: string;
  };
}

export interface CustomerMessageNews {
  touser: string;
  msgtype: "news";
  news: {
    article: Array<{
      title: string;
      description: string;
      url: string;
      picurl: string;
    }>;
  };
}

export interface CustomerMessageMpnews {
  touser: string;
  msgtype: "mpnews";
  mpnews: {
    media_id: string;
  };
}

export interface CustomerMessageWxcard {
  touser: string;
  msgtype: "wxcard";
  wxcard: {
    card_id: string;
  };
}
export interface CustomerMessageMiniprogrampage {
  touser: string;
  msgtype: "miniprogrampage";
  miniprogrampage: {
    title: string;
    appid: string;
    pagepath: string;
    thumb_media_id: string;
  };
}

export interface TemplateMessage {
  touser: string;
  template_id: string;
  url?: string;
  miniprogram?: {
    appid: string;
    pagepath: string;
  };
  data: any;
}

export interface JSTicket {
  ticket: string;
  expires_in: number;
}

export function sha1(data: string) {
  const shasum = crypto.createHash("sha1");
  shasum.update(data);
  return shasum.digest("hex");
}

export function nonceStr(length = 32): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const len = chars.length;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * len));
  }
  return result;
}

export function currentSeconds() {
  return Math.ceil(Date.now() / 1000);
}
