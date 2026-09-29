# 构建与运行

## 环境

- Windows 10/11；
- Rust（stable，edition 2024 需要较新的工具链）；
- MSVC 工具链 + Windows SDK（链接 `user32` / `gdi32` / `winhttp` / `dwmapi` 等系统库要用）。

## 跑起来

```bash
cargo run
```

依赖都可以离线构建（仓库里带 `Cargo.lock`）：

```bash
cargo build --offline
cargo test  --offline
```

## 调试开关（环境变量）

| 变量 | 作用 |
| --- | --- |
| `MEOW_FPS=1` | 每 60 帧打印一次实际帧率 |
| `MEOW_COVER_LOG=1` | 打印封面缩略图和帧尺寸（排查封面裁剪用） |
| `MEOW_UPDATE_LOG=1` | 打印更新检查的结果（查到什么版本、要不要提示） |
| `MEOW_LYRICS_WINDOW=1` | 启动时直接打开桌面歌词窗口 |
| `MEOW_ABOUT_LOG=1` | 关于页收款码解码情况 |

## 测试

```bash
cargo test --offline
```

覆盖了音频解码 / 均衡器数值 / 封面处理 / 歌词解析 / 窗口几何 / 图标表一致性这些**不需要真实音频设备**的部分。