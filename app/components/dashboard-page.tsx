import { DashboardDialogs } from './dashboard/dialogs'
import { DashboardShell } from './dashboard/shell'

export function DashboardPage({ appName }: { appName: string }) {
  return <div id="dashboard-page"><DashboardShell appName={appName} /><DashboardDialogs /></div>
}
