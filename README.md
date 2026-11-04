# Weather

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Cloudflare 網站部署

使用 Cloudflare Workers 託管公開網站；手機與電腦開啟同一個 HTTPS 網址即可，不需登入。氣象署金鑰由後端 Secret 保存，前端僅呼叫同源的 `/api/weather`。

```powershell
npm ci
npx --yes wrangler@4 login
npm run deploy:cloudflare
npx --yes wrangler@4 secret put CWA_API_KEY
```

最後一個指令會提示輸入氣象署 API 金鑰，不要把金鑰寫入程式或 Git。以 Wrangler 回傳的正式 workers.dev 網址為準。更新網站時執行 `npm run deploy:cloudflare`。

後端驗證：`npm run test:worker`。建置輸出為 `dist/`，設定為 `wrangler.json`，後端程式為 `worker/index.mjs`。

本機完整預覽：先執行 `npm run build`，將 `.dev.vars.example` 複製為 `.dev.vars` 並填入金鑰，再執行 `npx --yes wrangler@4 dev`。`.dev.vars` 已排除於 Git。
