# 未竟 · 与先贤对话

把尚未想清楚的事，放在这里。听见三种思想，选择一位继续聊。

![未竟首页预览](docs/images/home-preview.jpg)

这是一个默认在本机运行的中文网页应用。入口是约 7.6 秒的先贤浮雕与引文蒙太奇，首页以巨幅暗金题刻、缓慢光影和拱廊构成思想殿堂；输入问题后出现三位哲学家的独立回应；选择人物可进入持续对话，也可以返回、更换视角。首辑包含十位人物。

## Windows 一键使用

在 [GitHub Releases](https://github.com/Feng-R1/unfinished-dialogues/releases/latest) 下载最新的 Windows x64 压缩包，完整解压后双击 **`未竟.exe`**。无需安装 Node.js、npm、Python、数据库或下载项目依赖。

启动器提供演示模式和真实模型配置。演示模式不需要 API 密钥，可直接体验预写示例；真实对话需要填入你自己的模型密钥，并按模型服务商规则计费。密钥会使用当前 Windows 用户的数据保护功能加密存储在 `%LOCALAPPDATA%\UnfinishedDialogues`，不会随安装包或 GitHub 仓库发布。页面只监听本机回环地址，关闭启动器后本机服务停止。

运行包目前支持 Windows 10/11 x64。压缩包内包含 Node.js 官方运行环境，下载前应先完整解压。未购买代码签名证书，Windows SmartScreen 可能显示未知发布者；仅从本仓库 Releases 下载，并可用同页的 `SHA256SUMS.txt` 核对文件。

聊天记录继续保存在浏览器本地。升级时使用同一浏览器和同一地址即可继续读取；清除浏览器网站数据会删除记录。应用不会自动上传对话或使用者的模型密钥。

## 从源码运行

需要 Node.js 22 或更新版本及 npm。本次环境为 Windows / Node.js 23.1.0。

```powershell
git clone https://github.com/Feng-R1/unfinished-dialogues.git
cd unfinished-dialogues
npm ci
npm run dev
```

打开 <http://127.0.0.1:3000>。服务默认只监听本机。此方式适合参与开发；普通使用者可下载上方的免安装运行包。

依赖由锁文件固定。npm 下载缓存位于项目 `.npm-cache/`；安装不会主动更改全局 npm 配置。开发脚本显式使用 webpack，以保持 Windows 路径与构建方式一致。

## 连接真实模型

从源码运行时，未填写模型配置会显示**演示模式**，使用预写的思想示例。它能演示三人回应、流式显示、切换和记录，但不理解任意问题；重复追问可能出现重复的预写内容。

1. 将 `.env.example` 复制为 `.env.local`。
2. 同时填写三个字段：

```dotenv
MODEL_API_KEY=填入服务商密钥
MODEL_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-flash
NEXT_TELEMETRY_DISABLED=1
```

3. 重启服务，再开始一个**新问题**。

接口需要支持 OpenAI-compatible **Chat Completions + SSE streaming**。截至 2026-10-18，[DeepSeek 官方文档](https://api-docs.deepseek.com/)说明 `deepseek-flash` 对应 DeepSeek-V4.1-Flash-1017。可以按此填写；其他兼容服务请使用其官方接口地址与模型名。`.env.local` 已被 Git 忽略，请勿提交密钥。

真实调用会发送原始问题、所选人物的思想提示以及必要的当前分支上下文，按服务商规则计费。已使用真实 DeepSeek 服务测试三人回应和连续追问；这属于功能抽查，并非完整内容评测。为了及时呈现对话，DeepSeek 请求显式关闭默认的思考模式，直接流式返回回答。服务端日志仅保留通用错误标识，不打印上游原始错误。

仅填写部分字段会显示配置错误，不会静默降级。接口调用失败也不会偷偷改用演示内容。模式变化后，旧记录保留原模式，需要在首页开启新问题。

## 已实现的体验

- 苏格拉底、庄子、波伏瓦的原创 SVG 浮雕与有出处的引文开场；每个标签页会话首次展示，可随时跳过、Esc 退出，也可从页脚重映。
- 巨幅暗金题刻、拱廊、光束与尘埃构成动态背景；输入时降低干扰，对话中淡出景物；可暂停，遵循系统减少动态效果设置。无需视频、三维引擎或额外动效依赖。
- 原创“殿堂回响”音景：低频共鸣与缓慢泛音，开场伴随疏落钟磬；走近先贤、开启思考时有轻微交互音。默认静音，右上角或开场中主动开启；设置内可分别关闭氛围与交互音、调节音量及试听。深聊减弱背景音，页面进入后台时暂停。
- 输入、示例问题、空输入提示及 2000 字限制。
- 三位人物独立生成，完成一个就能先读；单个失败可重试。
- 十位人物资料库，按东方 / 西方筛选、更换一位人物。
- 独立的深聊分支、流式回复、停止与重试。
- IndexedDB 本机历史，刷新恢复、从历史打开、逐条删除。
- 思想依据与背景引文出处，区分原文、意译及 AI 思想演绎。
- 桌面、平板、手机布局，键盘操作，中文输入法组合状态处理。
- 每次对话保留演示 / 真实标记。模型密钥只用于服务端。

首版按主题规则选角，避免为了选择人物再付费调用一次模型。规则是可调整的启发式，并不声称能可靠识别所有隐含主题。可以手动更换人物。

声音由浏览器 Web Audio 在本机合成，没有下载音乐、音频接口费用或麦克风权限。音量和分项偏好存于当前浏览器，但开启状态不持久化，每次重新进入仍需主动开启。静音后平滑淡出并暂停音频上下文；跳过开场会取消尚未播放的开场音，避免之后突然响起。设备音量、浏览器静音和扬声器频响仍会影响实际听感。

长对话保留原问题与首轮观点，随后携带最近最多 24 条已完成消息，并限制文本预算。完整历史仍保留在本机；更早的追问可能不再进入模型上下文。尚未实现长期记忆或自动摘要。

## 内容边界

人物档案包含思想入口、常见误读和书目链接，不是对哲学家的完整重构。页面“思想依据”是背景阅读入口，不是逐句引用验证；未实现联网核查或原著向量检索。

背景与开场使用七句固定引文，部分背景文字截取自完整引文；中文意译单独标记，可从“文字出处”查看。现代情境下的对话为思想演绎。原创矢量肖像与浮雕是艺术形象，不代表历史容貌。

明确的自伤危机表达有现实支持路径；轻量关键词识别不能完整识别所有危机表述，真实模型系统提示也要求优先现实安全。

## 结构

```text
src/app/
  page.tsx                   页面入口
  globals.css                视觉、动效与响应式样式
  cinematic.css              墨黑暗金主题、场景与开场动画
  api/config/route.ts        只返回模式、就绪状态与模型显示名称
  api/dialogue/route.ts      输入校验、模型调用与 NDJSON 流
src/components/
  garden.tsx                 首页、多人回应、深聊与弹窗
  use-garden.ts              请求生命周期、分支状态与持久化
  portrait.tsx               原创矢量肖像
  stone-portrait.tsx         原创雕塑风格 SVG
  thought-atmosphere.tsx     动态引文、光影与建筑纵深
  cinematic-intro.tsx        可跳过、可重播的开场蒙太奇
  use-soundscape.ts          用户手势开启、场景切换与声音偏好
  sound-settings.tsx         声音总开关、分项控制、音量与试听
  modal.tsx                  原生 dialog，键盘焦点管理
src/lib/
  philosophers.ts            十位人物档案及固定引文
  dialogue.ts                选角、会话结构、上下文与流解析
  model.ts                   服务端配置与思想提示
  demo.ts                    明确标注的演示内容
  storage.ts                 IndexedDB 读写
  soundscape.ts              原创共鸣音景、钟磬与混响音频图
tests/                       状态、协议与本机模拟接口检查
docs/                        评测样例与验证记录
```

客户端请求每位哲学家时使用独立 AbortController 与请求标识。换问题后旧请求的迟到结果不能写入新会话。停止生成保留部分文字，并标记为未完成；未完成的助手回复不会进入后续模型上下文。

历史只保存在当前浏览器同源空间，`localhost` 与 `127.0.0.1` 是不同的存储来源，建议一直使用同一个地址。更换浏览器、清除网站数据后不会自动同步。页面没有账号与云存储。当前形态适合本机使用，公开多人部署前需要另行实现访问控制、限流与费用控制。

## 检查与生产构建

```powershell
npm run typecheck
npm test
npm run build
npm start
```

自动测试使用本机模拟模型服务，不需要密钥，不产生模型费用。某些受限 Windows 沙箱会禁止 `os.userInfo()`，导致 `tsx` 在运行测试前报 `uv_os_get_passwd`；请在正常终端运行，勿通过修改断言规避。

实际检查范围见 `docs/VERIFICATION.md`，人工内容评测样例见 `docs/EVALUATION.md`。

## 安全和 Git 管理

- 首次开发建议运行 `npm run hooks:install`。之后每次提交前，Git 会扫描暂存内容中的密钥、私有环境文件和证书；也可随时运行 `npm run secrets:check` 手动检查。
- CI 在 GitHub Actions 上运行类型检查、模拟接口测试和生产构建。
- 提交 `v*` Git 标签会自动构建并验证 Windows 运行包，随后创建 GitHub Release 和 SHA-256 校验文件。见 [发布说明](docs/RELEASING.md)。
- MIT 许可证见 `LICENSE`；运行包会同时附带 Node.js 和应用依赖的第三方许可证。

## 开源参考

实现使用 Next.js / React、AI SDK、Motion 和 Zod。人物配置思路参考调研过的 [Philosophers Council](https://github.com/dimitreOliveira/Philosophers-council)，没有直接复制其代码或提示词；没有引入其 Gradio / 本地 Gemma 运行方案。首版未引入 assistant-ui 或多智能体框架。

相关依赖许可及参考说明见 `THIRD_PARTY_NOTICES.md`。
