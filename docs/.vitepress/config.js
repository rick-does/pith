import { createRequire } from 'module'
const require = createRequire(import.meta.url)

let sidebar = []
try { sidebar = require('./sidebar.json') } catch {}

export default {
  title: 'PiTH',
  description: 'A visual markdown workspace with hierarchy editing and prose analysis',
  base: '/pith/',
  appearance: false,
  themeConfig: {
    search: { provider: 'local' },
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/rick-does/pith' }
    ]
  }
}
