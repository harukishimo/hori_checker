# テスラ相性チェッカー

Next.js App Router + TypeSafe AI Jevで、入力文の好み・体験・購入動機とTeslaの製品体験との相性を評価します。DB・ログイン不要。デジタル庁デザインシステムを参考にした独自UIです。Tesla・デジタル庁の公式サービスではありません。

## ローカル起動

Node.js 24.xを使用します。

```sh
npm ci
cp .env.example .env.local
# .env.local の TYPESAFE_API_KEY を設定
npm run dev
```

## Vercelにデプロイ

1. このGitHubリポジトリをVercelでImport。
2. Framework Preset: Next.js、Root Directory: リポジトリルート、Node.js: 24.x。
3. Environment Variablesに `TYPESAFE_API_KEY` を登録（サーバー専用。NEXT_PUBLIC_を付けない）。
4. 必要に応じて `TYPESAFE_MODEL=jev-latest` を登録。
5. Deploy。環境変数を後から変更した場合は再デプロイ。
6. 好みや体験を10文字以上入力して、実APIの結果を確認。

APIキーはGitにコミットしないでください。.env.localと.vercelは除外済みです。

## 判定の仕組み

- JevのChoiceで各観点に関する記述の有無、Scoreで共感の強さを評価（1回のAPIリクエスト）。
- テクノロジー／デザイン／電動車の走り／充電を含む利便性／電動化・エネルギーへの関心の5項目。
- 各スコア0〜4を0〜100に正規化し、記述のある項目だけ等しい重みで平均。未記載は0点にせず除外し、評価項目数を表示。
- 好みが読み取れない場合は判定保留。confidenceは得点に混ぜず、低い場合に注意表示。
- 所有者の認証や所有確率ではありません。統計的なユーザー像や購入推奨でもありません。
- 名前や話し口調、属性で判断しません。Teslaの所有宣言や株式保有だけでは加点しません。
- 評価文脈は `lib/profile.ts`、評価基準は `lib/checker.ts`。製品情報から作成した独自の指標です。
- 各説明は採点段階に対応した定型文で、Jevによる自由文生成ではありません。
- 入力や結果をアプリのDB・localStorage・ログへ保存しません。文章はTypeSafe AIへ送信され、同社のデータ取扱方針が適用されます。

## 運用

入力サイズ制限・タイムアウト・APIレスポンス検証・同一Originチェックを実装しています。Originチェックは認証や利用量制限ではありません。一般公開前にVercel Firewallのレート制限とTypeSafe側の利用上限を設定してください。共有DBなしのため、分散レート制限はプラットフォーム側で管理します。日本語の否定・皮肉・命令注入への耐性は継続的な検証が必要です。

```sh
npm test
npm run typecheck
npm run build
```

## 出典

- https://docs.typesafe.ai/introduction/quickstart
- https://docs.typesafe.ai/primitives/score
- https://www.tesla.com/ja_jp/model3
- https://www.tesla.com/ja_jp/charging
- https://www.tesla.com/ja_jp/support/software-updates
- https://design.digital.go.jp/dads/

## リアルタイム判定

10文字以上の入力が500ms止まると自動でAPIを呼びます。日本語IMEの変換中は送信を待ち、新しい入力・クリアで進行中のリクエストを中止します。古い応答は破棄し、入力欄のフォーカスを移動しません。ブラウザー側の中止は、既に開始されたAI処理や課金の取り消しを保証しません。
