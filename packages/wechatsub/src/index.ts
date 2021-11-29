/* eslint-disable camelcase */
import { ServiceOption, createInitFn, InitOption } from "use-services";

import * as crypto from "crypto";
import * as xml2js from "xml2js";
import * as ejs from "ejs";
import * as WXBizMsgCrypt from "wechat-crypto";

export type Option<S extends Service> = ServiceOption<Args, S>;

export interface Args {
  token: string;
  appId: string;
  encodingAESKey: string;
}

const tpl = `<xml>
  <ToUserName><![CDATA[<%-toUsername%>]]></ToUserName>
  <FromUserName><![CDATA[<%-fromUsername%>]]></FromUserName>
  <CreateTime><%=createTime%></CreateTime>
  <% if (msgType === "device_event" && (Event === "subscribe_status" || Event === "unsubscribe_status")) { %>
  <% if (Event === "subscribe_status" || Event === "unsubscribe_status") { %>
  <MsgType><![CDATA[device_status]]></MsgType>
  <DeviceStatus><%=deviceStatus%></DeviceStatus>
  <% } else { %>
  <MsgType><![CDATA[<%=msgType%>]]></MsgType>
  <Event><![CDATA[<%-event%>]]></Event>
  <% } %>
  <% } else { %>
  <MsgType><![CDATA[<%=msgType%>]]></MsgType>
  <% } %>
  <% if (msgType === "news") { %>
  <ArticleCount><%=content.length%></ArticleCount>
  <Articles>
  <% content.forEach(function(item){ %>
  <item>
  <Title><![CDATA[<%-item.title%>]]></Title>
  <Description><![CDATA[<%-item.description%>]]></Description>
  <PicUrl><![CDATA[<%-item.picUrl || item.picurl || item.pic %>]]></PicUrl>
  <Url><![CDATA[<%-item.url%>]]></Url>
  </item>
  <% }); %>
  </Articles>
  <% } else if (msgType === "music") { %>
  <Music>
  <Title><![CDATA[<%-content.title%>]]></Title>
  <Description><![CDATA[<%-content.description%>]]></Description>
  <MusicUrl><![CDATA[<%-content.musicUrl || content.url %>]]></MusicUrl>
  <HQMusicUrl><![CDATA[<%-content.hqMusicUrl || content.hqUrl %>]]></HQMusicUrl>
  <% if (content.thumbMediaId) { %> 
  <ThumbMediaId><![CDATA[<%-content.thumbMediaId || content.mediaId %>]]></ThumbMediaId>
  <% } %>
  </Music>
  <% } else if (msgType === "voice") { %>
  <Voice>
  <MediaId><![CDATA[<%-content.mediaId%>]]></MediaId>
  </Voice>
  <% } else if (msgType === "image") { %>
  <Image>
  <MediaId><![CDATA[<%-content.mediaId%>]]></MediaId>
  </Image>
  <% } else if (msgType === "video") { %>
  <Video>
  <MediaId><![CDATA[<%-content.mediaId%>]]></MediaId>
  <Title><![CDATA[<%-content.title%>]]></Title>
  <Description><![CDATA[<%-content.description%>]]></Description>
  </Video>
  <% } else if (msgType === "hardware") { %>
  <HardWare>
  <MessageView><![CDATA[<%-hardWare.MessageView%>]]></MessageView>
  <MessageAction><![CDATA[<%-hardWare.MessageAction%>]]></MessageAction>
  </HardWare>
  <FuncFlag>0</FuncFlag>
  <% } else if (msgType === "device_text" || msgType === "device_event") { %>
  <DeviceType><![CDATA[<%-deviceType%>]]></DeviceType>
  <DeviceID><![CDATA[<%-deviceId%>]]></DeviceID>
  <% if (msgType === "device_text") { %>
  <Content><![CDATA[<%-content%>]]></Content>
  <% } else if ((msgType === "device_event" && Event != "subscribe_status" && Event != "unsubscribe_status")) { %>
  <Content><![CDATA[<%-content%>]]></Content>
  <Event><![CDATA[<%-event%>]]></Event>
  <% } %>
  <SessionID><%=sessionId%></SessionID>
  <% } else if (msgType === "transfer_customer_service") { %>
  <% if (content && content.kfAccount) { %>
  <TransInfo>
  <KfAccount><![CDATA[<%-content.kfAccount%>]]></KfAccount>
  </TransInfo>
  <% } %>
  <% } else { %>
  <Content><![CDATA[<%-content%>]]></Content>
  <% } %>
  </xml>
`;

const wrapTpl = `<xml>
  <Encrypt><![CDATA[<%-encrypt%>]]></Encrypt>
  <MsgSignature><![CDATA[<%-signature%>]]></MsgSignature>
  <TimeStamp><%-timestamp%></TimeStamp>
  <Nonce><![CDATA[<%-nonce%>]]></Nonce>
</xml>`;

export class Service {
  public readonly args: Args;
  private cryptor: any;
  constructor(option: InitOption<Args, Service>) {
    this.args = option.args;
    this.cryptor = new WXBizMsgCrypt(
      this.args.token,
      this.args.encodingAESKey,
      this.args.appId
    );
  }

  public toXML = ejs.compile(tpl);
  private encryptWrap = ejs.compile(wrapTpl);

  public checkSignature(data: SignatureData) {
    const { signature, timestamp, nonce } = data;
    const shasum = crypto.createHash("sha1");
    const arr = [this.args.token, timestamp, nonce].sort();
    shasum.update(arr.join(""));

    return shasum.digest("hex") === signature;
  }

  public reply2CustomerService(
    fromUsername: string,
    toUsername: string,
    kfAccount: string
  ) {
    const info = {} as ReplyMsg;
    info.msgType = "transfer_customer_service";
    info.createTime = new Date().getTime();
    info.toUsername = toUsername;
    info.fromUsername = fromUsername;
    info.content = {};
    if (typeof kfAccount === "string") {
      info.content.kfAccount = kfAccount;
    }
    return this.toXML(info);
  }

  public async parse(body: string, query: any): Promise<IncomeMsg> {
    const parseXmlOptions = {
      trim: true,
      rootName: "xml",
      explicitRoot: false,
    };
    let xml = await xml2js.parseStringPromise(body, parseXmlOptions);
    xml = this.formatMessage(xml);
    const { msg_signature: signature, timestamp, nonce, encrypt_type } = query;
    if (!encrypt_type) {
      return xml;
    }
    const encryptMessage = xml.Encrypt;
    if (
      signature !== this.cryptor.getSignature(timestamp, nonce, encryptMessage)
    ) {
      throw new WechatBotError("InvalidSignature", "invalid signature");
    }
    const decrypted = this.cryptor.decrypt(encryptMessage);
    const messageWrapXml = decrypted.message;
    if (messageWrapXml === "") {
      throw new WechatBotError("InvalidAppId", "invalid appId");
    }
    const wrapXml = await xml2js.parseStringPromise(
      messageWrapXml,
      parseXmlOptions
    );
    return this.formatMessage(wrapXml);
  }

  public async encryptXml(xml: string) {
    const wrap = {} as any;
    wrap.encrypt = this.cryptor.encrypt(xml);
    wrap.nonce = parseInt((Math.random() * 100000000000).toString(), 10);
    wrap.timestamp = new Date().getTime();
    wrap.signature = this.cryptor.getSignature(
      wrap.timestamp,
      wrap.nonce,
      wrap.encrypt
    );
    return this.encryptWrap(wrap);
  }

  public reply(
    content: ReplyContent,
    fromUsername: string,
    toUsername: string,
    message: IncomeMsg
  ) {
    const info = {} as ReplyMsg;
    let type = "text";
    let content_ = content as any;
    info.content = content_ || "";
    info.createTime = new Date().getTime();
    if (
      message &&
      (message.MsgType === "device_text" || message.MsgType === "device_event")
    ) {
      info.deviceType = message.DeviceType;
      info.deviceId = message.DeviceID;
      info.sessionId = isNaN(message.SessionID) ? 0 : message.SessionID;
      info.createTime = Math.floor(info.createTime / 1000);
      if (
        message.Event === "subscribe_status" ||
        message.Event === "unsubscribe_status"
      ) {
        delete info.content;
        info.deviceStatus = isNaN(content_) ? 0 : content_;
      } else {
        if (!(content_ instanceof Buffer)) {
          content_ = String(content_);
        }
        info.content = Buffer.from(content_).toString("base64");
      }
      type = message.MsgType;
      if (message.MsgType === "device_event") {
        info.event = message.Event;
      }
    } else if (Array.isArray(content_)) {
      type = "news";
    } else if (typeof content_ === "object") {
      if (content_.type) {
        type = content_.type;
        if (content_.content) {
          info.content = content_.content;
        }
        if (content_.hardWare) {
          info.hardware = content_.HardWare;
        }
      } else {
        type = "music";
      }
    }
    info.msgType = type;
    info.toUsername = toUsername;
    info.fromUsername = fromUsername;
    return this.toXML(info);
  }

  private formatMessage(result: any) {
    const message = {} as any;
    if (typeof result === "object") {
      for (const key in result) {
        if (!(result[key] instanceof Array) || result[key].length === 0) {
          continue;
        }
        if (result[key].length === 1) {
          const val = result[key][0];
          if (typeof val === "object") {
            message[key] = this.formatMessage(val);
          } else {
            message[key] = (val || "").trim();
          }
        } else {
          message[key] = [];
          result[key].forEach(function (item) {
            message[key].push(this.formatMessage(item));
          });
        }
      }
      return message;
    } else {
      return result;
    }
  }
}

export const init = createInitFn(Service);

export interface IncomeMsgBase {
  MsgType: string;
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
}

export interface IncomeMsgNormal extends IncomeMsgBase {
  MsgId: number;
}

export interface IncomeMsgText extends IncomeMsgNormal {
  MsgType: "text";
  Content: string;
}

export interface IncomeMsgImage extends IncomeMsgNormal {
  MsgType: "image";
  MediaId: string;
  PicUrl: string;
}

export interface IncomeMsgVoice extends IncomeMsgNormal {
  MsgType: "voice";
  MediaId: string;
  Format: string;
  Recognition?: string;
}

export interface IncomeMsgVideo extends IncomeMsgNormal {
  MsgType: "video";
  MediaId: string;
  ThumbMediaId: string;
}

export interface IncomeMsgShortVideo extends IncomeMsgNormal {
  MsgType: "shortvideo";
  MediaId: string;
  ThumbMediaId: string;
}

export interface IncomeMsgLocation extends IncomeMsgNormal {
  MsgType: "location";
  Location_X: number;
  Location_Y: number;
  Scale: number;
  Label: string;
}

export interface IncomeMsgLink extends IncomeMsgNormal {
  MsgType: "link";
  Title: string;
  Description: string;
  Url: string;
}

export interface IncomeMsgEvent extends IncomeMsgBase {
  MsgType: "event";
  Event: string;
  EventKey?: string;
  Ticket?: string;
  Latitude?: number;
  Longitude?: number;
  Precision?: number;
}

export interface IncomeMsgDeviceText extends IncomeMsgBase {
  MsgID: number;
  MsgType: "device_text";
  DeviceType: string;
  DeviceID: string;
  Content: string;
  SessionID: number;
  OpenID: string;
}

export interface IncomeMsg extends IncomeMsgBase {
  Content?: string;
  MediaId?: string;
  PicUrl?: string;
  Format?: string;
  Recognition?: string;
  ThumbMediaId?: string;
  Location_X?: number;
  Location_Y?: number;
  Scale?: number;
  Event?: string;
  Label?: string;
  Title?: string;
  Description?: string;
  Url?: string;
  MsgId?: number;
  DeviceType?: string;
  DeviceID?: string;
  SessionID?: number;
  OpenID?: string;
}

interface ReplyMsg {
  msgType: string;
  createTime: number;
  toUsername: string;
  fromUsername: string;
  content: any;
  deviceType?: string;
  deviceId?: string;
  sessionId?: number;
  event?: string;
  deviceStatus?: number;
  hardware?: {
    MessageView: string;
    MessageAction: string;
  };
}

export type ReplyContent =
  | string
  | ReplyText
  | ReplyImage
  | ReplyVoice
  | ReplyVideo
  | ReplyMusic
  | ReplyNews[]
  | ReplyHardware;

export interface ReplyText {
  type: "text";
  content: string;
}

export interface ReplyImage {
  type: "image";
  content: {
    mediaId: string;
  };
}

export interface ReplyVoice {
  type: "voice";
  content: {
    mediaId: string;
  };
}

export interface ReplyVideo {
  type: "video";
  content: {
    title: string;
    description: string;
    mediaId: string;
  };
}

export interface ReplyMusic {
  title: string;
  description: string;
  musicUrl: string;
  hqMusicUrl: string;
  thumbMediaId: string;
}

export interface ReplyNews {
  title: string;
  description: string;
  picurl: string;
  url: string;
}

export interface ReplyHardware {
  type: "hardware";
  hardWare: {
    MessageView: string;
    MessageAction: string;
  };
}

export interface SignatureData {
  signature: string;
  timestamp: string;
  nonce: string;
}

export class WechatBotError extends Error {
  public kind: string;
  constructor(kind: string, msg: string) {
    super(msg);
    this.kind = kind;
    this.name = "WechatBotError";
  }
}
