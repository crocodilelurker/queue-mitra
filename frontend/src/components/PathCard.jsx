/** A titled box listing one branch of the triage flow (see Home). */
export default function PathCard({ title, hint, children }) {
  return (
    <section className="box path">
      <h2 className="path__title">{title}</h2>
      {hint && <p className="path__hint">{hint}</p>}
      {children}
    </section>
  )
}
