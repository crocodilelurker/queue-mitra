import { useEffect, useState } from 'react'
import { api } from '../../api/client.js'
import StaffShell, { useLiveRefetch, useStaffLive } from '../../components/staff/StaffShell.jsx'
import { Button, Card, DoctorStatusChip, EmptyState, InlineError, PageHeader, PasswordField, SelectField, TextField, errorText, useToast } from '../../components/staff/ui.jsx'

const blank = { name: '', email: '', password: '', departmentCode: '' }

function Doctors() {
  const live = useStaffLive()
  const toast = useToast()
  const [doctors, setDoctors] = useState(null)
  const [error, setError] = useState(null)
  const [f, setF] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  const departments = live.overview?.departments || []
  const load = () => api.adminDoctors().then((d) => setDoctors(d.doctors || [])).catch(setError)
  useEffect(() => {
    load()
  }, [])
  useLiveRefetch(load)

  const submit = async (e) => {
    e.preventDefault()
    const dept = departments.find((d) => d.code === f.departmentCode)
    if (!f.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) || f.password.length < 8 || !dept) {
      setFormError('Fill in name, a valid email, a password of at least 8 characters, and a department.')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await api.createDoctor({ name: f.name.trim(), email: f.email.trim().toLowerCase(), password: f.password, departmentCode: dept.code, room: dept.rooms?.[0] })
      toast(`${f.name} added`)
      setF(blank)
      load()
    } catch (e2) {
      setFormError(errorText(e2))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card title="Doctors" icon="doctor">
        {error && <InlineError error={error} onRetry={load} />}
        {doctors && !doctors.length && <EmptyState icon="doctor" title="No doctors yet" compact>Add a doctor below so their room can call patients.</EmptyState>}
        {doctors?.length > 0 && (
          <ul className="sx-list">
            {doctors.map((d) => (
              <li key={d._id}>
                <span style={{ flex: 1 }}>
                  <strong>{d.name}</strong>
                  <span className="sx-small sx-muted"> · {d.email} · {d.departmentName} · {d.room}</span>
                </span>
                <DoctorStatusChip status={d.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <form onSubmit={submit} noValidate>
        <Card title="Add a doctor" icon="user-plus" footer={<Button type="submit" variant="primary" icon="plus" busy={busy}>Add doctor</Button>}>
          <div className="sx-form-grid">
            <TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <TextField label="Email (used to sign in)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="off" />
            <PasswordField label="Temporary password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" />
            <SelectField label="Department" value={f.departmentCode} onChange={(e) => setF({ ...f, departmentCode: e.target.value })}>
              <option value="">Choose</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name} · {d.rooms?.[0]}
                </option>
              ))}
            </SelectField>
          </div>
          {formError && <div style={{ marginTop: 12 }}><InlineError>{formError}</InlineError></div>}
        </Card>
      </form>
    </>
  )
}

export default function People() {
  return (
    <StaffShell>
      <PageHeader title="People" subtitle="Doctors sign in with their email to their own room console." />
      <Doctors />
    </StaffShell>
  )
}
