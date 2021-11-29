/* eslint-disable camelcase */
import { ServiceOption, createInitFn, InitOption } from "use-services";
import * as crypto from "crypto";
import axios from "axios";

export type Option<S extends Service> = ServiceOption<Args, S>;

export interface Args {
  appId: string;
  secret: string;
  token?: string;
  encodingAESKey?: string;
  timeout?: number;
}

export class Service {
  public args: Args;
  constructor(option: InitOption<Args, Service>) {
    this.args = option.args;
    this.args.timeout = this.args.timeout || 2500;
  }

  public wxBizDataDecrypt(
    sessionKeyRaw: string,
    encryptedDataRaw: string,
    ivRaw: string
  ) {
    const { appId } = this.args;
    const sessionKey = Buffer.from(sessionKeyRaw, "base64");
    const encryptedData = Buffer.from(encryptedDataRaw, "base64");
    const iv = Buffer.from(ivRaw, "base64");

    let decoded;
    try {
      const decipher = crypto.createDecipheriv("aes-128-cbc", sessionKey, iv);
      decipher.setAutoPadding(true);
      decoded = (decipher as any).update(encryptedData, "binary", "utf8");
      decoded += decipher.final("utf8");
      decoded = JSON.parse(decoded);
    } catch (err) {
      throw new WechatLiteArgError("wechatlite: biz data decrypt failed");
    }

    if (decoded.watermark.appid !== appId) {
      throw new WechatLiteArgError("wechatlite: biz data decrypt failed");
    }

    return decoded;
  }

  public async code2Session(code: string) {
    const { appId, secret, timeout } = this.args;
    const resp = await axios({
      method: "get",
      url: "https://api.weixin.qq.com/sns/jscode2session",
      timeout,
      params: {
        appid: appId,
        secret,
        js_code: code,
        grant_type: "authorization_code",
      },
      responseType: "json",
    });
    return resp.data;
  }

  public async getWXACodeUnlimit(
    accessToken: string,
    page: string,
    scene: string
  ) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/wxa/getwxacodeunlimit",
      method: "post",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
      },
      data: JSON.stringify({
        scene,
        page,
      }),
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
      url: "https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send",
      method: "post",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
      },
      data: JSON.stringify(msg),
    });
    return resp.data;
  }

  public async uploadTempMedia(
    accessToken: string,
    img: Buffer,
    imgfile: string,
    imgtype: string
  ) {
    const resp = await axios({
      url: "https://api.weixin.qq.com/cgi-bin/media/upload",
      method: "post",
      timeout: this.args.timeout,
      params: {
        access_token: accessToken,
        type: "image",
      },
      data: JSON.stringify({
        media: {
          value: img,
          options: {
            contentType: imgtype,
            filename: imgfile,
          },
        },
      }),
    });
  }

  public checkSignature(signature: string, timestamp: string, nonce: string) {
    const { token } = this.args;
    if (!token) {
      throw new WechatLiteArgError("wechatlite args token is required");
    }
    const key = [token, timestamp, nonce].sort().join("");
    return sha1(key) === signature;
  }

  public decryptWXContact(wechatData: string) {
    const { encodingAESKey } = this.args;
    if (!encodingAESKey) {
      throw new WechatLiteArgError("wechatlite args token is required");
    }
    const key = Buffer.from(encodingAESKey + "=", "base64");
    const iv = key.slice(0, 16);
    const result = decryptContact(key, iv, wechatData);
    const decryptedResult = JSON.parse(result);
    return <ContactMessage>decryptedResult;
  }

  private checkError(name: string, err: Error, body: any) {
    if (err) {
      return new WechatLiteRequestError(
        `wechatlite: ${name} request failed, err ${err.message}`
      );
    }
    if (body.errcode) {
      return new WechatLiteBusinessError(
        `wechatlite: ${name} failed, ${body.errcode}, ${body.errmsg}`,
        body.errcode,
        body.errmsg
      );
    }
  }
}

export const init = createInitFn(Service);

export class WechatLiteRequestError extends Error {}
export class WechatLiteArgError extends Error {}
export class WechatLiteBusinessError extends Error {
  public readonly errcode: string;
  public readonly errmsg: string;
  constructor(msg: string, errcode: string, errmsg: string) {
    super(msg);
    this.errcode = errcode;
    this.errmsg = errmsg;
  }
}

export interface Session {
  openid: string;
  session_key: string;
  unionid?: string;
}

export interface AccessToken {
  access_token: string;
  expires_in: number;
}

export type CustomerMessage =
  | CustomerMessageText
  | CustomerMessageImage
  | CustomerMessageLink
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

export interface CustomerMessageLink {
  touser: string;
  msgtype: "link";
  link: {
    title: string;
    description: string;
    url: string;
    thumb_url: string;
  };
}

export interface CustomerMessageMiniprogrampage {
  touser: string;
  msgtype: "miniprogrampage";
  miniprogrampage: {
    title: string;
    pagepath: string;
    thumb_media_id: string;
  };
}

export type ContactMessage =
  | ContactMessageText
  | ContactMessageImage
  | ContactMessageMiniprogrampage
  | ContactMessageEvent;

export interface ContactMessageText {
  FromUserName: string;
  CreateTime: number;
  MsgType: "text";
  Content: string;
  MsgId: number;
}

export interface ContactMessageImage {
  FromUserName: string;
  CreateTime: number;
  MsgType: "image";
  PicUrl: string;
  MediaId: string;
  MsgId: number;
}

export interface ContactMessageMiniprogrampage {
  FromUserName: string;
  CreateTime: number;
  MsgType: "miniprogrampage";
  MsgId: number;
  Title: string;
  AppId: string;
  PagePath: string;
  ThumbUrl: string;
  ThumbMediaId: string;
}

export interface ContactMessageEvent {
  FromUserName: string;
  CreateTime: number;
  MsgType: "event";
  Event: string;
  SessionFrom: string;
}

export interface TemplateMessage {
  touser: string;
  template_id: string;
  page: string;
  form_id: string;
  data?: {
    [k: string]: {
      value: string;
    };
  };
  emphasis_keyword?: string;
}

export interface UploadTempMediaRes {
  type: string;
  media_id: string;
  created_at: string;
}

function decryptContact(key, iv, crypted) {
  const aesCipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  aesCipher.setAutoPadding(false);
  let decipheredBuff = Buffer.concat([
    aesCipher.update(crypted, "base64"),
    aesCipher.final(),
  ]);
  decipheredBuff = decodePKCS7(decipheredBuff);
  const lenNetOrderCorpid = decipheredBuff.slice(16);
  const msgLen = lenNetOrderCorpid.slice(0, 4).readUInt32BE(0);
  const result = lenNetOrderCorpid.slice(4, msgLen + 4).toString();
  return result;
}

function decodePKCS7(buff) {
  let pad = buff[buff.length - 1];
  if (pad < 1 || pad > 32) {
    pad = 0;
  }
  return buff.slice(0, buff.length - pad);
}

export function sha1(data: string) {
  const shasum = crypto.createHash("sha1");
  shasum.update(data);
  return shasum.digest("hex");
}
