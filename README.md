# th123data

東方非想天則（TH12.3）のフレームデータを JSON 化し、検索・比較できるようにしたリポジトリです。

## データの出典と利用について

本リポジトリのフレームデータ（`frame_data.json`、`search_index.json`、`chars/*.json` など）は、Wiki サイト [細々と東方非想天則を攻略するwiki](https://w.atwiki.jp/bulletaction/)（以下、本 wiki）の公開情報を、**wiki 運営者の許可を得たうえで**抽出・加工したものです。

- **出典**: https://w.atwiki.jp/bulletaction/
- **加工内容**: 全キャラクター分のフレーム表のスクレイピング、技名・表記の正規化、ネスト構造のフラット化、検索用インデックスの生成 など
- **利用について**: 本リポジトリに含まれる **加工済みデータ** および **抽出・加工に用いたソースコード**（スクレイパー、正規化スクリプト、検索 UI など）は、**自由に利用・改変・再配布して構いません**（商用利用を含む）。

加工データの権利放棄については [LICENSE-DATA](LICENSE-DATA)（CC0 1.0）を、ソフトウェアについては [LICENSE](LICENSE)（MIT）を参照してください。

本 wiki の原文・画像そのものの二次利用条件は wiki 側の規約に従ってください。本リポジトリが提供するのは、許可を得て作成した JSON データとそれを生成するツールです。

## 構成

| パス | 内容 |
|------|------|
| `frame_data.json` | 全20キャラ分のフレームデータ（フラット化済み） |
| `chars/*.json` | キャラ別の生データ |
| `build_index.mjs` | 検索用インデックス生成 |
| `search/` | フレームデータ検索 Web UI（Vite + TypeScript） |
| `docs/` | 検索 UI のビルド出力（GitHub Pages 用） |
| `scrape_one.js` など | wiki からのデータ取得・正規化スクリプト |

## 使い方

### 検索 UI（ローカル）

```bash
npm run dev:search
```

ブラウザで `http://localhost:5173` を開きます。

### ビルド

```bash
npm run build:search
```

`docs/` に静的サイトが出力されます。

### インデックスのみ再生成

```bash
npm run build:index
```

## 検索 UI の機能

- **キャラ別**: キャラクターを選び、カテゴリ（通常技・必殺技など）別に一覧表示
- **技名比較**: 同じ技名（例: `4A`）を全キャラで横断比較
- **条件検索**: 有利差が一定以下の技など、条件で絞り込み

## GitHub Pages

`master` / `main` への push で [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) により `docs/` がデプロイされます。リポジトリ Settings → Pages → Source を **GitHub Actions** に設定してください。

## ライセンス

| 対象 | ライセンス |
|------|-----------|
| 加工済みデータ（`frame_data.json`、`search_index.json`、`chars/` など） | [CC0 1.0](LICENSE-DATA) |
| ソースコード（スクレイパー、検索 UI、ビルドスクリプトなど） | [MIT](LICENSE) |

## 免責

データの正確性は保証しません。対戦や攻略の参考としてご利用ください。最新情報は [本 wiki](https://w.atwiki.jp/bulletaction/) を確認してください。
