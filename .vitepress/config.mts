import { defineConfig } from 'vitepress'

// Meow Player 的文档站。跑起来：在 docs/ 目录里 `npm i` 然后 `npm run dev`。

// GitHub Pages 项目站点的地址是 https://<user>.github.io/<repo>/，
// 所以 base 必须写成仓库名。仓库改名或换自定义域名时只改这一行。
const base = '/meow-player-docs/'

export default defineConfig({
  lang: 'zh-CN',
  title: 'Meow Player',
  description: '一个使用 Rust + GPUI 实现的本地音乐播放器',
  base,
  cleanUrls: true,
  // 浏览器标签页图标。注意：head 里的路径不会自动拼 base，必须自己加。
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}logo.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}logo.png` }],
  ],
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '下载', link: 'https://gitee.com/xarzhi/meow-player/releases' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '这是什么', link: '/guide/' },
          { text: '安装与上手', link: '/guide/install' },
          { text: '功能一览', link: '/guide/features' },
          { text: '性能与资源占用', link: '/guide/performance' },
          { text: '为什么做它', link: '/guide/why' },
          { text: '快捷键', link: '/guide/shortcuts' },
          { text: '常见问题', link: '/guide/faq' },
        ],
      }
    ],
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '主题',
    returnToTopLabel: '回到顶部',
    search: { provider: 'local' },
    footer: {
      message: '基于 Rust + GPUI，仅供学习交流',
      copyright: 'Meow Player',
    },
  },
})