import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import DepartmentStep from '../components/new/DepartmentStep.jsx'
import DescribeStep from '../components/new/DescribeStep.jsx'
import EmergencyBanner from '../components/new/EmergencyBanner.jsx'
import EmergencyButton from '../components/new/EmergencyButton.jsx'
import EmergencyTicketStep from '../components/new/EmergencyTicketStep.jsx'
import KnowledgeStep from '../components/new/KnowledgeStep.jsx'
import PatientInfoStep from '../components/new/PatientInfoStep.jsx'
import ReviewStep from '../components/new/ReviewStep.jsx'
import StepIndicator from '../components/new/StepIndicator.jsx'
import { useAccess } from '../context/Access.jsx'
import { useEmergency } from '../context/Emergency.jsx'
import { useI18n } from '../i18n/index.jsx'
import { navigate, useLocation } from '../router.jsx'
import { speak } from '../utils/speech.js'

const EMPTY_PATIENT = { firstName: '', age: '', gender: '', mobile: '', assisted: false, helperName: '' }
const STEP_NUMBER = { info: 1, know: 2, dept: 3, describe: 3, review: 4, complaint: 2 }

// /new (also /register): registration for a new OPD ticket.
//
// Normal ticket: details -> department (known, or described) -> review -> token (4 steps).
// Emergency ticket (/new?emergency=1, started from the Emergency buttons): details -> optional problem
// -> token at once (2 steps). The emergency ticket goes to the front of the queue and alerts staff.
//
// Patient details stay in memory until the ticket is created; the only thing sent to the backend is
// POST /api/tickets on the last step.
export default function NewPatient() {
  const { t, lang } = useI18n()
  const { prefs, setPref } = useAccess()
  const { openEmergency } = useEmergency()
  const { search } = useLocation()
  const emergency = new URLSearchParams(search).get('emergency') === '1'
  const preset = new URLSearchParams(window.location.search).get('dept')?.toUpperCase() || null

  const [step, setStep] = useState('info') // info | know | dept | describe | review | complaint
  const [patient, setPatient] = useState(EMPTY_PATIENT)
  const [dept, setDept] = useState(preset)
  const [route, setRoute] = useState(preset ? 'preset' : null) // how the department was chosen

  const titles = {
    info: t.infoTitle,
    know: t.knowQuestion,
    dept: t.chooseDept,
    describe: t.describeTitle,
    review: t.reviewTitle,
    complaint: t.complaintTitle,
  }

  // Assisted mode (or the read-aloud preference) speaks each question aloud.
  useEffect(() => {
    if (patient.assisted || prefs.readAloud) speak(titles[step], lang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lang])

  const update = (patch) => {
    if (patch.assisted === true) {
      // "Someone is helping me" -> bigger text and spoken questions.
      setPref('largeText', true)
      setPref('readAloud', true)
    }
    setPatient((prev) => ({ ...prev, ...patch }))
  }

  // The round button switches a normal ticket into the emergency flow, keeping what was typed.
  const startEmergency = () => {
    navigate('/new?emergency=1', { replace: true })
    if (step !== 'info') setStep('complaint') // details are already valid, so go straight to the last step
  }
  const endEmergency = () => {
    navigate('/new', { replace: true })
    setStep('info')
  }

  const pickDept = (code, via) => {
    setDept(code)
    setRoute(via)
    setStep('review')
  }

  const backFromReview = () => setStep(route === 'describe' ? 'describe' : route === 'dept' ? 'dept' : preset && route === 'preset' ? 'info' : 'know')

  return (
    <Layout hideEmergency className="main--form">
      <h1 className="hero hero--sm">{emergency ? t.emergencyTicketTitle : t.newTitle}</h1>
      <StepIndicator current={emergency ? Math.min(STEP_NUMBER[step], 2) : STEP_NUMBER[step]} total={emergency ? 2 : 4} />
      {emergency && <EmergencyBanner onCancel={endEmergency} />}
      <div className="form-layout">
        <div className="form-card">
          <h2 className="form__title">{titles[step]}</h2>
          {step === 'info' && (
            <PatientInfoStep patient={patient} onChange={update} onContinue={() => setStep(emergency ? 'complaint' : dept ? 'review' : 'know')} />
          )}
          {step === 'complaint' && <EmergencyTicketStep patient={patient} onBack={() => setStep('info')} />}
          {step === 'know' && <KnowledgeStep onBack={() => setStep('info')} onChoose={(c) => setStep(c === 'knowledge' ? 'dept' : 'describe')} />}
          {step === 'dept' && (
            <DepartmentStep
              value={dept}
              onSelect={(code) => {
                setDept(code)
                setRoute('dept')
              }}
              onContinue={() => setStep('review')}
              onDescribe={() => setStep('describe')}
              onBack={() => setStep('know')}
            />
          )}
          {step === 'describe' && (
            <DescribeStep patient={patient} onAccept={(code) => pickDept(code, 'describe')} onChooseOther={() => setStep('dept')} onBack={() => setStep('know')} />
          )}
          {step === 'review' && <ReviewStep patient={patient} deptCode={dept} onBack={backFromReview} />}
        </div>
        <EmergencyButton onPress={emergency ? () => openEmergency({ inTicketFlow: true }) : startEmergency} />
      </div>
    </Layout>
  )
}
