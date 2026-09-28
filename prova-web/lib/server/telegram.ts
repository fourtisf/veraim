import { ENV } from "./env";

export const telegramEnabled = () => !!(ENV.telegramToken && ENV.telegramBot);

export async function tg(method: string, body: object) {
  const res = await fetch(`${ENV.telegramApi}/bot${ENV.telegramToken}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`telegram ${method}: ${data.description}`);
  return data.result;
}

export const sendTelegram = (chatId: string, text: string) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
