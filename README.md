# WiseMindAI Obsidian

## 插件是什么

WiseMindAI Obsidian 是 WiseMindAI 的 Obsidian 桌面插件，用来连接本机正在运行的 WiseMindAI，让 Obsidian 和 WiseMindAI 之间可以互相同步 Markdown 内容。

它主要支持两类使用场景：

- 把 Obsidian 笔记导入 WiseMindAI，继续用 WiseMindAI 做 AI 对话、知识库整理、文档管理和资料处理。
- 把 WiseMindAI 里的笔记、文档、知识库文档同步回 Obsidian，继续用 Obsidian 管理和阅读。

插件只通过 WiseMindAI 本地接口同步数据，不会直接读写 WiseMindAI 数据库。

## 适合谁使用

- 平时用 Obsidian 写长期笔记，也用 WiseMindAI 做资料整理的人。
- 想把 Obsidian 里的 Markdown 批量导入 WiseMindAI 的人。
- 想把 WiseMindAI 里整理好的笔记、文档或知识库内容同步回 Obsidian 的人。
- 不想在两个工具之间反复复制、粘贴、重建文件夹的人。

## 使用前准备

1. 安装并启动 WiseMindAI 桌面应用。
2. 在 WiseMindAI 中开启本地接口服务。
3. 默认接口地址为 `http://127.0.0.1:38221`。
4. 在 Obsidian 中安装并启用 `WiseMindAI Obsidian` 插件。

如果你改过 WiseMindAI 本地接口端口，需要在插件设置里把接口地址改成一致。

## 安装方式

当前可使用手动安装方式：

1. 在项目根目录构建插件：

```bash
npm run build:obsidian
```

2. 在 Obsidian 仓库中创建插件目录：

```text
.obsidian/plugins/wisemindai-obsidian/
```

3. 复制以下文件到该目录：

```text
packages/wisemindai-obsidian/main.js
packages/wisemindai-obsidian/manifest.json
packages/wisemindai-obsidian/styles.css
```

4. 回到 Obsidian，打开第三方插件设置，启用 `WiseMindAI Obsidian`。

## 打开同步控制台

启用插件后，可以通过以下方式打开同步控制台：

- 点击 Obsidian 左侧栏的 WiseMindAI 图标。
- 在命令面板执行 `WiseMindAI: 打开同步控制台`。
- 点击底部状态栏里的 WiseMindAI 状态。

同步控制台会展示：

- WiseMindAI 连接状态。
- 当前 Obsidian 仓库中的 Markdown 笔记。
- WiseMindAI 笔记和笔记文件夹。
- WiseMindAI 文档和文档文件夹。
- WiseMindAI 知识库和知识库文档。
- 当前选中的同步方向、同步范围和目标位置。

控制台顶部还提供 `API 设置`、`使用教程`、`打开官网`、`同步历史` 等入口。

## 把 Obsidian 导入 WiseMindAI

在同步控制台中：

1. 选择同步方向 `Obsidian -> WiseMindAI`。
2. 在左侧选择要导入的 Obsidian Markdown 笔记或文件夹。
3. 在右侧选择 WiseMindAI 保存位置，可以保存为笔记、文档或知识库内容。
4. 如需覆盖已有同名内容，勾选 `覆盖已有`。
5. 点击 `执行同步`。

默认设置会把 Obsidian 内容导入为 WiseMindAI 笔记和知识库内容。默认知识库名称是 `Obsidian 导入`，可在插件设置中修改。

## 从 WiseMindAI 同步到 Obsidian

在同步控制台中：

1. 选择同步方向 `WiseMindAI -> Obsidian`。
2. 选择 WiseMindAI 来源类型：文档、笔记或知识库。
3. 勾选要同步的内容，可以按文件夹、知识库或单条内容选择。
4. 选择一个或多个 Obsidian 写入文件夹，也可以新建目标文件夹。
5. 如需保留 WiseMindAI 的文件夹层级，勾选 `包含文件夹`。
6. 如需覆盖已有内容，勾选 `覆盖已有`。
7. 点击 `执行同步`。

默认写入根目录是：

```text
WiseMindAI
```

勾选 `包含文件夹` 后，插件会尽量保留 WiseMindAI 里的文件夹结构。知识库内容会按知识库名称归类。

## 右键快捷入口

插件在 Obsidian 里提供了快捷发送入口：

- 在文件列表右键 Markdown 文件，可以发送到 WiseMindAI。
- 可以指定发送为 WiseMindAI 笔记、文档或知识库内容。
- 在文件夹上右键，可以发送整个文件夹里的 Markdown 文件。
- 在编辑器中右键，可以发送当前笔记。
- 选中文本后右键，可以只把选中文本发送为 WiseMindAI 笔记摘录。

快捷入口会使用插件设置里的默认保存目标和重复处理策略。

## 同步方案

如果你经常同步固定范围，可以把当前选择保存为同步方案。

同步方案会保存：

- 同步方向。
- 选中的 Obsidian 文件或文件夹。
- 选中的 WiseMindAI 内容或分组。
- 保存目标。
- 目标文件夹。

下次打开同步控制台后，可以直接选择方案并执行同步。

## 同步历史

同步历史会记录每次同步的结果，包括：

- 同步时间。
- 同步方向。
- 来源文件夹。
- 目标位置。
- 同步文件名称。
- 新建、更新、跳过和失败数量。

你可以在同步控制台点击 `同步历史` 查看，也可以搜索文件、文件夹或目标位置。

## 重复内容处理

插件支持三种重复处理方式：

- `更新`：发现同来源或同名内容时更新原内容。
- `跳过`：发现已有内容时不修改。
- `创建副本`：不覆盖旧内容，尽量创建新文件。

同步控制台里的 `覆盖已有` 会影响本次执行：

- 勾选后使用更新策略。
- 不勾选时尽量创建副本，减少误覆盖。

插件会在同步内容中写入来源标记，用来识别后续同步关系。

## 插件设置

在 Obsidian 插件设置中可以配置：

- `WiseMindAI 本地接口地址`：默认 `http://127.0.0.1:38221`。
- `Obsidian 写入根目录`：默认 `WiseMindAI`。
- `默认知识库名称`：默认 `Obsidian 导入`。
- `重复内容处理`：可选跳过、更新、创建副本。
- `测试 WiseMindAI 连接`：检查 Obsidian 是否能连上 WiseMindAI。

## 常见问题

### Obsidian 提示无法连接 WiseMindAI

先确认 WiseMindAI 已启动，并且本地接口服务已开启。默认地址是：

```text
http://127.0.0.1:38221
```

如果你改过端口，请在插件设置里同步修改。

### 为什么有些 Obsidian 文件没有出现在列表里

插件只扫描 Markdown 文件。默认会忽略 `.obsidian`、回收站和隐藏目录，并跳过过大的文件。

### 为什么有些 WiseMindAI 内容没有出现在同步列表里

当前插件主要同步可转成 Markdown 的笔记、文档和知识库文档。如果内容没有可读正文，可能不会作为可同步内容展示。

### 插件会把数据上传到服务器吗

不会。插件连接的是本机 WiseMindAI 本地接口，Obsidian 和 WiseMindAI 之间的数据流转发生在本机。

### 插件会改我的 Obsidian 文件名吗

从 Obsidian 导入 WiseMindAI 时，不会修改原 Obsidian 文件名。从 WiseMindAI 同步回 Obsidian 时，会按 WiseMindAI 内容标题创建 Markdown 文件。
