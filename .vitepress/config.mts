import { defineConfig } from 'vitepress'

// Meow Player 的文档站。跑起来：在 docs/ 目录里 `npm i` 然后 `npm run dev`。
export default defineConfig({
  lang: 'zh-CN',
  title: 'Meow Player',
  description: '一个使用 Rust + GPUI 实现的本地音乐播放器',
  // GitHub Pages 项目站点的地址是 https://<user>.github.io/<repo>/，
  // 所以 base 必须写成仓库名。仓库改名或换自定义域名时要同步改这里。
  base: '/meow-player-docs/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/' },
      { text: '开发', link: '/dev/build' },
      { text: 'Gitee', link: 'https://gitee.com/xarzhi/meow-player/releases' },
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
      },
      {
        text: '开发',
        items: [
          { text: '构建与运行', link: '/dev/build' },
          { text: '打包与发布', link: '/dev/package' },
          { text: '目录结构', link: '/dev/architecture' },
          { text: '文档站', link: '/dev/docs' },
        ],
      },
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