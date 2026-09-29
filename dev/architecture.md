# 目录结构

```
src/
  main.rs              程序入口、窗口创建、一堆 Win32 FFI（win_util 模块）
  app.rs               PlayerApp：所有状态 + 命令处理 + 顶层渲染
  theme.rs             亮 / 暗两套配色
  icon.rs              图标（iconfont 导出的 SVG，include_bytes! 进程序）
  update.rs            检查 Gitee 发行版 + 更新弹窗
  spectrum.rs          频谱：取样器（挂在音频源上）+ 手写 FFT
  cover_cache.rs       封面缩略图缓存、模糊、旋转、唱片贴图生成
  audio_player.rs      共享输出（rodio）
  audio_exclusive.rs   独占输出（WASAPI）
  equalizer.rs         10 段均衡器（双二阶滤波器）
  lyrics.rs            歌词解析
  playlist.rs          歌单的库操作（SQLite）
  pages/               各页面：歌曲 / 专辑 / 音乐家 / 歌单 / 设置 / 全屏播放页
  components/          界面件：播放条、桌面歌词窗口、迷你播放器、菜单、弹窗、tooltip
  iconfont/            图标源（iconfont.json / .js / 导出的 svg）
build.rs              版本资源 + 图标资源
build_support/        上面那份资源脚本（主程序和安装器共用）
installer/            安装程序（独立 crate，把主程序和卸载器编进自己）
tools/                排查脚本（截图、点击、图标导出等）
```

## 几个贯穿全局的实现约定

- **状态全在 `PlayerApp` 里**：页面和组件都是它的方法，通过 `cx.listener` 回调改状态；
- **跨窗口共享状态**用 `LyricsFeed` 这条「信箱」（主窗口写、桌面歌词 / 迷你播放器读），命令用 `AppCommand` 发回主窗口执行；
- **动画**用 gpui 的 `with_animation`，并且只在「正在动画」的标记 / 截止时间内挂上去，避免元素重新挂载时重播；
- **图片要显式给 `aspect_ratio`**：gpui 的 `img` 会按图片自身比例覆盖显式宽高，方形封面必须写 `aspect_ratio(1.0)`；
- **圆角窗口**用 DWM 的 `DWMWA_WINDOW_CORNER_PREFERENCE`（合成器绘制、抗锯齿），`SetWindowRgn` 只作为 Win10 兜底；
- **自己的 tooltip**：gpui 自带的 tooltip 只能跟鼠标、没有方向参数，所以 `components/hover_tip.rs` 里自己封装了一个带方向的。