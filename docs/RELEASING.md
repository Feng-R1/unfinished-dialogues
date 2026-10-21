# 发布 Windows 免安装版

正式发布由 GitHub Actions 在 Windows runner 上完成。仓库不提交编译产物、Node.js 运行时或个人模型配置。

## 发布步骤

1. 更新 `package.json` 的版本，并运行 `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` 同步锁文件。
2. 检查 `README.md`、`docs/VERIFICATION.md` 和第三方许可说明，确认面向用户的行为与本次版本一致。
3. 运行 `npm run secrets:check`、`npm run typecheck`、`npm test` 和 `npm run build`。
4. 提交版本变更并推送 `main`。
5. 创建与 `package.json` 版本完全一致的标签，例如 `v0.2.0`，再推送标签：

   ```powershell
   git tag v0.2.0
   git push origin v0.2.0
   ```

6. GitHub Actions 会在 Windows runner 上重新验证源码、构建 standalone 应用、下载并校验官方 Node.js 运行时、编译启动器、扫描发行包、解压并运行安装包自测。全部通过后才会创建 Release。
7. 在仓库的 Actions 和 Releases 页面检查运行结果、压缩包与 `SHA256SUMS.txt`。发布文件名包含版本号。

工作流需要仓库默认的 `GITHUB_TOKEN` 具备创建 Release 的权限。若组织策略禁止工作流写入 Release，应由仓库管理员调整 Actions 权限后再发布；不要把个人访问令牌写进 workflow 或仓库密钥文件。

## 本机复现

只在 Windows x64 上构建发行包。需要 Node.js 22、npm、Windows 自带的 .NET Framework C# 编译器和网络连接：

```powershell
npm ci
npm run secrets:check
npm run typecheck
npm test
npm run build:release
npm run package:windows
npm run test:package
```

输出位于 `dist/`：版本化 ZIP 与 SHA-256 校验文件。构建会下载 Node.js 官方 ZIP 并核对 Node.js 发布目录中的 SHA-256。`.env.local` 不进入 Git、压缩包或 CI；构建脚本还会扫描解压后的发行目录。发行包只内置演示模式默认值，不含任何可供所有使用者共享的模型凭据。
