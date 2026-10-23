import { useI18n } from '../../i18n/index.jsx'

export default function KnowledgeStep({ onChoose, onBack }) {
  const { t } = useI18n()
  return (
    <div className="form">
      <div className="knowledge">
        <button type="button" className="knowledge__btn" onClick={() => onChoose('knowledge')}>
          <span className="knowledge__icon" aria-hidden="true">
            ✅
          </span>
          <span>
            <strong>{t.knowledge}</strong>
            <span>{t.knowledgeHint}</span>
          </span>
        </button>
        <button type="button" className="knowledge__btn" onClick={() => onChoose('noKnowledge')}>
          <span className="knowledge__icon" aria-hidden="true">
            ❓
          </span>
          <span>
            <strong>{t.noKnowledge}</strong>
            <span>{t.noKnowledgeHint}</span>
          </span>
        </button>
      </div>
      <button type="button" className="btn" onClick={onBack}>
        <span aria-hidden="true">←</span> {t.back}
      </button>
    </div>
  )
}
