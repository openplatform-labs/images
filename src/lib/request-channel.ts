import { headers } from "next/headers";
import {
  getChannelConfig,
  isChannelId,
  resolveChannelFromHost,
  type ChannelConfig,
  type ChannelId,
} from "./channel";

/** 서버 컴포넌트·라우트에서 현재 요청 채널 */
export async function getRequestChannel(): Promise<ChannelId> {
  const headerStore = await headers();
  const fromMiddleware = headerStore.get("x-channel");
  if (isChannelId(fromMiddleware)) return fromMiddleware;

  return resolveChannelFromHost(headerStore.get("host"));
}

export async function getRequestChannelConfig(): Promise<ChannelConfig> {
  return getChannelConfig(await getRequestChannel());
}
