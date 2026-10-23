import { useEffect, useState } from 'react'
import Layout from '../components/Layout.jsx'
import DepartmentStep from '../components/new/DepartmentStep.jsx'
import DescribeStep from '../components/new/DescribeStep.jsx'
import EmergencyButton from '../components/new/EmergencyButton.jsx'
import KnowledgeStep from '../components/new/KnowledgeStep.jsx'
import PatientInfoStep from '../components/new/PatientInfoStep.jsx'
import ReviewStep from '../components/new/ReviewStep.jsx'
import StepIndicator from '../components/new/StepIndicator.jsx'
import { useAccess } from '../context/Access.jsx'
import { useI18n } from '../i18n/index.jsx'
import { speak } from '../utils/speech.js'

const EMPTY_PATIENT = { firstName: '', age: '', gender: '', mobile: '', assisted: false, helperName: '' }
const STEP_NUMBER = { info: 1, know: 2, dept: 3, describe: 3, review: 4 }

// /new (also /register): registration for a new OPD ticket. Patient details stay in memory until the
// token is created; the only thing sent to the backend is POST /api/tickets on the last step.
export default function NewPatient() {
  const { t, lang } = useI18n()
  const { prefs, setPref } = useAccess()
  const preset = new URLSearchParams(window.location.search).get('dept')?.toUpperCase() || null

  const [step, setStep] = useState('info') // info | know | dept | describe | review
  const [patient, setPatient] = useState(EMPTY_PATIENT)
  const [dept, setDept] = useState(preset)
  const [route, setRoute] = useState(preset ? 'preset' : null) // how the department was chosen

  const titles = { info: t.infoTitle, know: t.knowQuestion, dept: t.chooseDept, describe: t.describeTitle, review: t.reviewTitle }

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

  const pickDept = (code, via) => {
    setDept(code)
    setRoute(via)
    setStep('review')
  }

  const backFromReview = () => setStep(route === 'describe' ? 'describe' : route === 'dept' ? 'dept' : preset && route === 'preset' ? 'info' : 'know')

  return (
    <Layout hideEmergency className="main--form">
      <h1 className="hero hero--sm">{t.newTitle}</h1>
      <StepIndicator current={STEP_NUMBER[step]} total={4} />
      <div className="form-layout">
        <div className="box form-card">
          <h2 className="form__title">{titles[step]}</h2>
          {step === 'info' && (
            <PatientInfoStep patient={patient} onChange={update} onContinue={() => setStep(dept ? 'review' : 'know')} />
          )}
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
            <DescribeStep
              patient={patient}
              onAccept={(code) => pickDept(code, 'describe')}
              onChooseOther={() => setStep('dept')}
              onBack={() => setStep('know')}
            />
          )}
          {step === 'review' && <ReviewStep patient={patient} deptCode={dept} onBack={backFromReview} />}
        </div>
        <EmergencyButton />
      </div>
    </Layout>
  )
}
