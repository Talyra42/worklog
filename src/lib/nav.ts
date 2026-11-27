import type { IconName } from '../components/Icon'
import type { View } from '../types'

export interface NavItem {
  id: View
  label: string
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'today', label: '今日', icon: 'clock' },
  { id: 'month', label: '月度', icon: 'calendar' },
  { id: 'records', label: '记录', icon: 'list' },
]
