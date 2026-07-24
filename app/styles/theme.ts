import { baseStyles } from './base'
import { dashboardStyles } from './dashboard'
import { shareStyles } from './share'

export const styles = `${baseStyles}${dashboardStyles}${shareStyles}`

export function safe(value: string): string {
  return value.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
}
