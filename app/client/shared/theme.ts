import { renderIcons } from './icons'
import type { Theme } from './types'

const themeStorageKey = 'edgedisk:theme'

export function initTheme(toggle: HTMLButtonElement): () => void {
  let theme: Theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'

  const apply = (nextTheme: Theme, persist: boolean): void => {
    theme = nextTheme
    document.documentElement.setAttribute('data-theme', theme)
    if (persist) localStorage.setItem(themeStorageKey, theme)
    const icon = toggle.querySelector<HTMLElement>('[data-icon]')
    if (icon) {
      icon.replaceChildren()
      icon.dataset.icon = theme === 'light' ? 'moon' : 'sun'
      renderIcons(icon)
    }
    toggle.dataset.tooltip = theme === 'light' ? '切换到深色主题' : '切换到浅色主题'
    toggle.setAttribute('aria-label', toggle.dataset.tooltip)
  }

  apply(theme, false)
  return () => apply(theme === 'light' ? 'dark' : 'light', true)
}
