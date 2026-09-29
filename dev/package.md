# 打包与发布

## 一条命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File package.ps1
```

产物：

```
target\release\MeowPlayer_v{版本}_setup.exe
```

（版本号从主程序 `Cargo.toml` 的 `version` 读，主程序、安装器、安装包文件名、注册表里的 `DisplayVersion` 全部跟着它走 —— 只有一处真源。）

想顺便把版本 +0.1（`0.2.0 → 0.3.0`）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File package.ps1 -Bump
```

## 脚本做了什么

1. `cargo build --release` → 主程序 `target\release\meow-player-gpui.exe`；
2. `cargo build --profile small --bin MeowPlayerUninstall` → 小卸载器 `target\small\MeowPlayerUninstall.exe`；
3. 构建安装器（`installer/` 这个 crate）→ `target\release\MeowPlayerSetup.exe`；
4. 复制成 `MeowPlayer_v{版本}_setup.exe`。

**顺序不能换**：安装器是用 `include_bytes!` 把前两个 exe 直接编进去的。

## 版本号 / 图标资源

`build.rs`（主程序和安装器共用 `build_support/version_resource.rs`）在构建时生成一份 `.rc`，用 Windows SDK 的 `rc.exe` 编译成 `.res` 再链接进 exe：

- **版本信息**：Windows 属性页的「文件版本 / 产品版本」读的是它；
- **图标**：仓库根目录的 `logo.ico`，任务管理器 / 资源管理器显示的就是它。

> 改了这两样东西之后如果发现没生效，先跑一次 `cargo clean -p meow-player-gpui` 再打包 —— 这个包的增量构建偶尔会判定失误。

## 发布

1. 改 `Cargo.toml` 的 `version`（或让 `package.ps1 -Bump` 自动 +0.1）；
2. 打包；
3. 把 `MeowPlayer_v{版本}_setup.exe` 传到 Gitee 的发行版，**tag 写成 `v{版本}`**（客户端「检查新版本」就是拿这个 tag 和程序版本比的）；
4. Release 的说明会显示在程序的更新弹窗里（最多 200 字）。