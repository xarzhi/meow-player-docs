---
layout: home

hero:
  name: Meow Player
  text: 本地音乐播放器
  tagline: Rust + GPUI 写的，界面 GPU 加速，从音乐库到桌面歌词一整套
  image:
        src: /logo.png
        alt: VitePress
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/
    - theme: alt
      text: 下载最新版
      link: https://gitee.com/xarzhi/meow-player/releases

features:
  - title: 音乐库
    details: SQLite 存库，扫描时读标签（标题 / 艺术家 / 专辑 / 时长 / 内嵌封面与歌词），支持按拼音排序和首字母分组。
  - title: 播放
    details: 共享输出走系统混音；独占输出绕开混音、按文件采样率直出。内置 10 段均衡器。
  - title: 歌词
    details: 全屏页逐字歌词、独立桌面歌词窗口（可贴任务栏）、每行逐字填充与自动居中滚动。
  - title: 频谱
    details: 全屏页进度条上方那条频谱是从音频流真取样做 FFT 算的，柱数、粗细、圆角、颜色都可调。
  - title: 迷你播放器
    details: 独立小窗，封面作模糊背景、进度画成边框、点进度条跳转、按住封面拖窗口。
  - title: 细节
    details: 托盘、全局快捷键、窗口材质（云母 / 亚克力）、亮暗主题、壁纸、Gitee 更新检查。
  - title: 轻
    details: 单进程、无 WebView 运行时、安装包约 57MB、空闲内存约 50MB —— 常驻也不心疼。
  - title: 认真对待卡顿
    details: 频谱手写 FFT、封面按显示尺寸分档缓存、高频路径都做过实测优化，还有一页专门写性能。
---

## 一句话

本地优先、单进程、不联网（除了查一下有没有新版本）的 Windows 音乐播放器。界面是 GPUI 直接 GPU 绘制，不是套壳网页。

<div style="display:flex;gap:12px;flex-wrap:wrap;margin:24px 0">
  <a href="/meow-player/guide/"><strong>先看功能一览 →</strong></a>
  <a href="/meow-player/guide/performance/">性能与资源占用 →</a>
  <a href="/meow-player/guide/faq/">常见问题 →</a>
</div>

## 主要特性速览

| 方面 | 做到了什么 |
| --- | --- |
| 音乐库 | 多目录扫描、读全标签、拼音排序与首字母分组、音质徽标 |
| 播放 | 共享输出 / WASAPI 独占输出、10 段自写均衡器、任务栏进度 |
| 歌词 | 逐字填充、点句跳转、独立桌面歌词窗、**可贴任务栏** |
| 频谱 | 真取样 + 手写 FFT + 对数分频，柱数/粗细/圆角/颜色可调 |
| 迷你播放器 | 独立小窗、进度画成边框、歌词把当前字滚到中间、可拖可点跳转 |
| 系统集成 | 托盘、全局快捷键、单实例、窗口材质、DWM 圆角 |
| 更新 | 查 Gitee 发行版、弹窗提示、可跳过、频率可调 |