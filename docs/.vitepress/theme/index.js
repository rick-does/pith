import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import './style.css'

const PiTHTitle = {
  render() {
    return h('span', { class: 'pith-title' }, [
      'Pi',
      h('span', { class: 'pith-t' }, 'T'),
      'H Docs'
    ])
  }
}

const SearchIcon = {
  render() {
    return h('button', {
      class: 'nav-search-icon',
      'aria-label': 'Search',
      onClick() {
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })
        )
      }
    }, [
      h('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: '18',
        height: '18',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }, [
        h('circle', { cx: '11', cy: '11', r: '8' }),
        h('path', { d: 'm21 21-4.35-4.35' })
      ])
    ])
  }
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-title-before': () => h(PiTHTitle),
      'nav-bar-content-before': () => h(SearchIcon)
    })
  }
}
