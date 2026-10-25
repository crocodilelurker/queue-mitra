import StaffShell, { useStaffLive } from '../../components/staff/StaffShell.jsx'
import { EmptyState, PageHeader, SkeletonCards } from '../../components/staff/ui.jsx'
import { DepartmentCard } from './AdminDashboard.jsx'
import './console.css'

function List() {
  const live = useStaffLive()
  const departments = live.overview?.departments || []
  if (!live.overview) return <SkeletonCards count={3} height={170} />
  if (!departments.length)
    return (
      <div className="sx-card">
        <EmptyState icon="layers" title="No departments yet">
          Departments are added in the setup wizard. Editing departments here is coming next.
        </EmptyState>
      </div>
    )
  return (
    <div className="qc-dept-grid">
      {departments.map((d) => (
        <DepartmentCard key={d._id || d.code} d={d} />
      ))}
    </div>
  )
}

export default function Departments() {
  return (
    <StaffShell>
      <PageHeader title="Departments" subtitle="OPD departments running today, with their rooms, seats and live crowd level." />
      <List />
    </StaffShell>
  )
}
