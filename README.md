# Orbit Todo

A simple, aesthetic Todo app powered by Firebase.

## ローカル開発環境の構築

Firebase Emulator を使用してローカル環境で開発を行う手順です。

### 1. 環境変数の設定

`.env.example` を参考に、プロジェクトルートに `.env.local` を作成し、Firebase の設定を行います。

**`.env.local` の設定例:**
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

# Firebase Emulatorを使用する場合は true に設定
VITE_USE_FIREBASE_EMULATOR="true"
```

### 2. 必要ツールのインストール

Firebase Emulator の実行には **Java** が必要です。また、Node.js がインストールされていることを確認してください。

> [!TIP]
> ツール管理ツール `mise` を利用している場合は、プロジェクトルートで `mise install` を実行することで、必要な Node.js や Java が自動的にセットアップされます。
> また、`mise` を使用する場合は `.env.local` の代わりに `mise.local.toml` を使用して環境変数を定義することも可能です。

依存関係をインストールします。

```bash
npm install
```

### 3. Firebase エミュレータの起動

ローカル環境で動作確認を行うため、Firebase エミュレータ（Authentication, Firestore）を起動します。

```bash
npm run firebase:emulators
```

### 4. 開発用サーバーの起動

別のターミナルを開き、フロントエンドの開発サーバーを起動します。

```bash
npm run dev
```

起動後、ブラウザで `http://localhost:5173` にアクセスしてください。`VITE_USE_FIREBASE_EMULATOR="true"` が設定されている場合、アプリは自動的にローカルエミュレータと通信します。

---

Built with ❤️ using Vite, React, and TanStack Router.
