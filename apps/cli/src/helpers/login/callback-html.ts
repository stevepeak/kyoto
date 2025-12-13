export const CALLBACK_HTML = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kyoto CLI Login</title>
    <style>
      :root {
        --parchment: #f5f1e8;
        --terracotta: #c97d60;
        --muted-orange: #d4a574;
        --soft-orange: #e8c4a0;
        --text-dark: #5a4a3a;
        --text-muted: #8b7a6b;
      }
      html,
      body {
        height: 100%;
        margin: 0;
      }
      body {
        font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic",
          "YuGothic", "Noto Sans JP", "游ゴシック", "メイリオ", Meiryo,
          sans-serif;
        background: var(--parchment);
        color: var(--text-dark);
        position: relative;
        overflow: hidden;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      body::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: radial-gradient(
          circle at 0.5px 0.5px,
          rgba(0, 0, 0, 0.03) 0.5px,
          transparent 0
        );
        background-size: 8px 8px;
        pointer-events: none;
      }
      .landscape {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40%;
        overflow: hidden;
        z-index: 0;
      }
      .layer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 50% 50% 0 0;
      }
      .layer-1 {
        height: 100%;
        background: var(--terracotta);
        transform: scaleY(0.6) translateY(20%);
      }
      .layer-2 {
        height: 85%;
        background: var(--muted-orange);
        transform: scaleY(0.7) translateY(15%);
      }
      .layer-3 {
        height: 70%;
        background: var(--soft-orange);
        transform: scaleY(0.8) translateY(10%);
      }
      .content {
        position: relative;
        z-index: 10;
        text-align: center;
        max-width: 480px;
      }
      .brand {
        font-size: 32px;
        font-weight: 500;
        letter-spacing: 0.05em;
        color: var(--text-dark);
        margin-bottom: 24px;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 400;
        line-height: 1.4;
        color: var(--text-dark);
        margin-bottom: 12px;
      }
      .check {
        display: inline-block;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--terracotta);
        color: var(--parchment);
        font-size: 20px;
        line-height: 32px;
        margin-right: 12px;
        vertical-align: middle;
      }
      p {
        margin: 16px 0 0;
        font-size: 15px;
        line-height: 1.8;
        color: var(--text-muted);
      }
      .hint {
        margin-top: 20px;
        font-size: 13px;
        color: var(--text-muted);
        opacity: 0.8;
      }
    </style>
  </head>
  <body>
    <div class="landscape">
      <div class="layer layer-1"></div>
      <div class="layer layer-2"></div>
      <div class="layer layer-3"></div>
    </div>
    <div class="content">
      <div class="brand">Kyoto</div>
      <h1><span class="check" aria-hidden="true">✓</span></h1>
      <p>Login complete, you can close this window.</p>
    </div>
  </body>
</html>
`
