import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import Header from '../components/Header.jsx'
import OfflineBanner from '../components/OfflineBanner.jsx'
import StepIndicator from '../components/new/StepIndicator.jsx'
import PatientInfoStep from '../components/new/PatientInfoStep.jsx'
import KnowledgeStep from '../components/new/KnowledgeStep.jsx'
import DoctorDepartmentStep from '../components/new/DoctorDepartmentStep.jsx'
import ProblemStep from '../components/new/ProblemStep.jsx'
import Confirmation from '../components/new/Confirmation.jsx'

const EMPTY_PATIENT = { firstName: '', age: '', gender: '' }
const EMPTY_DOCTOR = { doctorName: '', department: '' }

// Frontend-only prototype: all values live in component state (memory) and are dropped on start over / reload.
// Nothing is persisted or sent anywhere.
export default function NewPatient() {
  const { t } = useI18n()
  const [step, setStep] = useState('info') // info | choice | knowledge | noKnowledge | done
  const [patient, setPatient] = useState(EMPTY_PATIENT)
  const [doctor, setDoctor] = useState(EMPTY_DOCTOR)
  const [problem, setProblem] = useState('')
  const [path, setPath] = useState('knowledge') // branch chosen on the knowledge step

  const startOver = () => {
    setPatient(EMPTY_PATIENT)
    setDoctor(EMPTY_DOCTOR)
    setProblem('')
    setStep('info')
  }
  const choose = (next) => {
    setPath(next)
    setStep(next)
  }
  const indicator = { info: 1, choice: 2, knowledge: 3, noKnowledge: 3, done: 3 }[step]

  return (
    <>
      <OfflineBanner />
      <div className="page">
        <Header />
        <main className="main main--form">
          <h1 className="hero hero--sm">{t.newTitle}</h1>
          <StepIndicator current={indicator} />
          <div className="box form-card">
            {step === 'info' && (
              <PatientInfoStep patient={patient} onChange={(p) => setPatient((prev) => ({ ...prev, ...p }))} onContinue={() => setStep('choice')} />
            )}
            {step === 'choice' && <KnowledgeStep onChoose={choose} onBack={() => setStep('info')} />}
            {step === 'knowledge' && (
              <DoctorDepartmentStep values={doctor} onChange={(d) => setDoctor((prev) => ({ ...prev, ...d }))} onSubmit={() => setStep('done')} onBack={() => setStep('choice')} />
            )}
            {step === 'noKnowledge' && (
              <ProblemStep value={problem} onChange={setProblem} onSubmit={() => setStep('done')} onBack={() => setStep('choice')} />
            )}
            {step === 'done' && <Confirmation patient={patient} path={path} doctor={doctor} problem={problem} onStartOver={startOver} />}
          </div>
        </main>
      </div>
    </>
  )
}
