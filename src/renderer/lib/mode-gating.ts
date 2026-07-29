import { useAppStore } from '@/stores/app.store'

export type UIMode = 'basic' | 'advanced' | 'expert'

const MODE_ORDER: UIMode[] = ['basic', 'advanced', 'expert']

function hasMode(required: UIMode): boolean {
  const current = useAppStore.getState().uiMode || 'advanced'
  return MODE_ORDER.indexOf(current) >= MODE_ORDER.indexOf(required)
}

export function canUse(feature: UIMode): boolean {
  return hasMode(feature)
}

export function filterByMode<T extends { minMode?: UIMode }>(items: T[]): T[] {
  return items.filter(item => !item.minMode || hasMode(item.minMode))
}

export function getUiMode(): UIMode {
  return useAppStore.getState().uiMode || 'advanced'
}
