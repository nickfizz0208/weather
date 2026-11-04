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

## Cloudflare Pages 部署

此專案會產生靜態網站，手機與電腦可使用同一個 HTTPS 網址開啟，不需登入。

首次部署先在本機登入 Cloudflare（帳密只輸入官方登入頁）：

```powershell
npx --yes wrangler@4 login
npx --yes wrangler@4 pages project create weather-nickfizz0208 --production-branch main
```

安裝相依套件後部署：

```powershell
npm ci
npm run deploy:cloudflare
```

建置輸出為 `dist/`，專案設定在 `wrangler.json`。部署後請使用 Wrangler 回傳的正式 `pages.dev` 網址。

若使用 Cloudflare Pages 的 Git 整合，建置指令為 `npm run build`、輸出目錄為 `dist`；請選擇包含修正版的分支。
