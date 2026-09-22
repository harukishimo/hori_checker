import { inputSchema, buildPayload, parseResult } from "@/lib/checker";

export const runtime = "nodejs";
export const maxDuration = 30;
const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const source = new URL(origin);
      const host = request.headers.get("host") || new URL(request.url).host;
      if (!["http:", "https:"].includes(source.protocol) || source.host !== host) {
        return reply({ error: "この操作はアプリの画面から実行してください。" }, 403);
      }
    } catch {
      return reply({ error: "送信元を確認できませんでした。" }, 403);
    }
  }
  if (!request.headers.get("content-type")?.includes("application/json"))
    return reply({ error: "JSON形式で送信してください。" }, 415);
  // Bound streamed bytes before JSON parsing, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: "文章を入力してください。" }, 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 40000) {
        await reader.cancel();
        return reply(
          { error: "入力が長すぎます。文字数を減らしてください。" },
          413,
        );
      }
      chunks.push(value);
    }
  } catch {
    return reply({ error: "入力を読み取れませんでした。" }, 400);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return reply({ error: "入力形式を確認してください。" }, 400);
  }
  const input = inputSchema.safeParse(raw);
  if (!input.success)
    return reply(
      { error: "好みや体験を10〜3,000文字で入力してください。" },
      400,
    );
  const key = process.env.TYPESAFE_API_KEY;
  if (!key)
    return reply(
      {
        error: "APIキーが未設定です。管理者が設定してから再度お試しください。",
      },
      503,
    );
  try {
    const response = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        buildPayload(input.data, process.env.TYPESAFE_MODEL || "jev-latest"),
      ),
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok)
      return reply(
        {
          error:
            response.status === 429
              ? "判定が混み合っています。少し待ってから再度お試しください。"
              : "AIサービスに接続できませんでした。時間をおいて再度お試しください。",
        },
        response.status === 429 ? 429 : 502,
      );
    return reply(parseResult(await response.json()));
  } catch (error) {
    const timeout =
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name);
    return reply(
      {
        error: timeout
          ? "判定に時間がかかっています。再度お試しください。"
          : "判定結果を取得できませんでした。再度お試しください。",
      },
      timeout ? 504 : 502,
    );
  }
}
