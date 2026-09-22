"use client";
import { useState, useRef, useEffect, type FormEvent } from "react";
import type { CheckResult } from "@/lib/checker";

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [composing, setComposing] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const resetResult = (clear = false) => {
    generation.current += 1;
    activeRequest.current?.abort();
    setPending(false);
    if (clear) setResult(null);
    setError("");
  };

  useEffect(() => {
    const input = text.trim();
    if (composing || input.length < 10 || input.length > 3000) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const id = ++generation.current;
    const isCurrent = () => !controller.signal.aborted && id === generation.current;
    const timer = setTimeout(async () => {
      setPending(true);
      try {
        const response = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "判定できませんでした。");
        if (isCurrent()) setResult(data);
      } catch (e) {
        if (isCurrent()) setError(
          e instanceof Error && e.name === "TimeoutError"
            ? "通信がタイムアウトしました。再判定をお試しください。"
            : e instanceof Error ? e.message : "通信に失敗しました。",
        );
      } finally {
        if (isCurrent()) setPending(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, composing, retry]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetResult();
    setRetry(value => value + 1);
  }
  return (
    <>
      <a className="skip" href="#main">
        本文へ移動
      </a>
      <header>
        <div className="header-inner">
          <a
            className="brand"
            href="/"
            aria-label="テスラ相性チェッカー ホーム"
          >
            <span className="brand-icon" aria-hidden="true">
              T<span className="brand-dot">・</span>
            </span>
            テスラ相性チェッカー<span className="beta">β版</span>
          </a>
          <a className="header-link" href="#about">
            このサービスについて <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>
      <main id="main">
        <div className="breadcrumb">
          ホーム <span aria-hidden="true">/</span> 相性チェック
        </div>
        <section className="intro">
          <p className="eyebrow">TESLA AFFINITY</p>
          <h1>
            あなたの好みは、
            <br className="mobile-break" />
            どれくらいテスラ派？
          </h1>
          <p className="lead">
            好きなもの、車に求めること、心が動いた体験。
            <br />
            あなたの言葉から、テスラの魅力との相性を可視化します。
          </p>
          <div className="tags">
            <span>登録不要</span>
            <span>アプリ内で文章を保存しません</span>
            <span>Powered by Jev</span>
          </div>
        </section>
        <div className="notice">
          <span className="info-icon" aria-hidden="true">
            i
          </span>
          <p>
            好みと製品の魅力を照らし合わせる診断です。実際のテスラ所有者かどうかを判定するものではありません。
          </p>
        </div>
        <div className="workspace">
          <section className="input-panel" aria-labelledby="input-title">
            <div className="section-heading">
              <span className="step">01</span>
              <h2 id="input-title">あなたの好みを入力</h2>
            </div>
            <form onSubmit={submit}>
              <label htmlFor="text">
                好きなもの・車に求めること{" "}
                <span className="required">必須</span>
              </label>
              <p className="hint" id="text-hint">
                10〜3,000文字で入力すると自動で判定します。入力が止まって約0.5秒後に結果を更新します。
              </p>
              <textarea
                id="text"
                aria-describedby="text-hint text-count"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  resetResult(e.target.value.length === 0);
                }}
                placeholder="例：スマホのようにアップデートで機能が増える車に惹かれます。すっきりした内装が好きで、家で充電して朝そのまま出発できる暮らしに憧れます。"
                minLength={10}
                maxLength={3000}
                required
                onCompositionStart={() => {
                  resetResult();
                  setComposing(true);
                }}
                onCompositionEnd={(event) => {
                  resetResult();
                  setText(event.currentTarget.value);
                  setComposing(false);
                }}
              />
              <p className="counter" id="text-count">
                {text.length.toLocaleString()} / 3,000文字
              </p>
              <p className="privacy">
                入力中の文章は、自動判定のためTypeSafe AIへ送信されます。日本語の変換中は送信しません。
              </p>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              <div className="actions">
                <button type="submit" disabled={pending || composing || text.trim().length < 10}>
                  再判定する
                  <span aria-hidden="true">→</span>
                </button>
                <button
                  className="clear"
                  type="button"
                  disabled={!text}
                  onClick={() => {
                    setText("");
                    resetResult(true);
                  }}
                >
                  入力をクリア
                </button>
              </div>
            </form>
          </section>
          <section
            className="result-panel"
            aria-labelledby="result-title"
            aria-busy={pending}
          >
            <div className="section-heading">
              <span className="step">02</span>
              <h2 id="result-title">チェック結果</h2>
            </div>
            <div aria-live="polite">
              {text.length > 0 && <>
                <p className="result-label">あなたの「テスラ共感度」</p>
                <div className="score">{result?.score ?? "—"}<span> / 100</span></div>
              </>}
              {result ? (
                result.insufficient ? (
                  <div className="empty">
                    <h3>もう少し具体的に教えてください</h3>
                    <p>
                      製品の特徴につながる好みを読み取れませんでした。
                      <br />
                      車に求めることや好きな体験を追記してください。
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="result-summary">
                      {(result.score ?? 0) >= 75
                        ? "テスラの魅力に強く共感する好みです"
                        : (result.score ?? 0) >= 50
                          ? "テスラの魅力と重なる好みがあります"
                          : "別のクルマ体験を好む傾向が見られます"}
                    </p>
                    <div className="metrics">
                      {result.items.map((item) => (
                        <div className="metric" key={item.id}>
                          <div>
                            <span>{item.label}</span>
                            <strong>
                              {item.score === null ? (
                                "記述なし"
                              ) : (
                                <>
                                  {item.score}
                                  <small> / 100</small>
                                </>
                              )}
                            </strong>
                          </div>
                          {item.score !== null && (
                            <meter
                              min={0}
                              max={100}
                              value={item.score}
                              aria-label={item.label}
                            />
                          )}
                          <p className="metric-note">{item.observation}</p>
                        </div>
                      ))}
                    </div>
                    {result.uncertain && (
                      <p className="uncertain">
                        評価にばらつきがあります。何に魅力を感じるか、理由や体験を詳しく書くと判断しやすくなります。
                      </p>
                    )}
                    <p className="result-note">
                      記述がある{result.coverage} /
                      5項目の平均です。書かれていない項目は除外しています。所有者である確率ではありません。各項目の説明は評価段階の定型文です。
                    </p>
                    <span className="model">判定モデル：{result.model}</span>
                  </>
                )
              ) : text.length > 0 ? (
                <p className="result-note">点数は入力内容に合わせて自動で更新されます。</p>
              ) : (
                <div className="empty">
                  <div className="document-icon" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <b>✓</b>
                  </div>
                  <h3>結果はこちらに表示されます</h3>
                  <p>好きなものや車に求めることを入力すると、<br />点数がここに表示されます。</p>
                  <div className="empty-metrics">
                    <span>テクノロジー</span>
                    <span>デザイン</span>
                    <span>走り</span>
                    <span>利便性</span>
                    <span>エネルギー</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
        <section id="about" className="about">
          <h2>このサービスについて</h2>
          <div className="about-grid">
            <article>
              <span className="about-number">01</span>
              <h3>5つの魅力と照らし合わせる</h3>
              <p>
                テクノロジー、デザイン、走り、充電を含む利便性、電動化への関心を個別に評価します。
              </p>
            </article>
            <article>
              <span className="about-number">02</span>
              <h3>文章は保存しません</h3>
              <p>
                アプリに履歴は残りません。入力した文章は判定のためTypeSafe
                AIへ送信されます。
              </p>
            </article>
            <article>
              <span className="about-number">03</span>
              <h3>自分の好みを発見する</h3>
              <p>
                テスラを選ぶ理由は人それぞれ。所有の有無や肩書きではなく、書かれた好みをもとに判定します。
              </p>
            </article>
          </div>
          <details className="profile-details">
            <summary>判定の基準と出典を見る</summary>
            <p>
              Tesla公式の製品情報をもとにした独自の評価軸です。「テスラユーザー全員の性格」や購入動機の統計ではありません。好み・体験・購入理由への共感を評価し、話し口調や年齢、性別、職業、資産、政治観では採点しません。
            </p>
            <p>
              各項目を5段階で評価し100点に換算。記述のある項目だけを等しい重みで平均します。1項目だけでも結果は出ますが、あなたの好み全体を表すとは限りません。好みを読み取れない入力は判定を保留します。
            </p>
            <p>
              出典：
              <a
                href="https://www.tesla.com/ja_jp/model3"
                target="_blank"
                rel="noreferrer"
              >
                Model 3
              </a>
              、
              <a
                href="https://www.tesla.com/ja_jp/charging"
                target="_blank"
                rel="noreferrer"
              >
                充電
              </a>
              、
              <a
                href="https://www.tesla.com/ja_jp/support/software-updates"
                target="_blank"
                rel="noreferrer"
              >
                ソフトウェア アップデート
              </a>
              。基準更新：2026年9月22日。
            </p>
          </details>
        </section>
      </main>
      <footer>
        <div>
          <span className="footer-brand">テスラ相性チェッカー</span>
          <p>本サービスはTesla・デジタル庁の公式サービスではありません。</p>
          <a
            href="https://design.digital.go.jp/dads/"
            target="_blank"
            rel="noreferrer"
          >
            デザイン参考：デジタル庁デザインシステム ↗
          </a>
        </div>
        <span>© {new Date().getFullYear()} TESLA AFFINITY</span>
      </footer>
    </>
  );
}
