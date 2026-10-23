const COLORS = { green: 'ok', amber: 'warn', red: 'bad' }

/** Department queue at a glance: overcrowding colour, who is being served, who is next. */
export default function QueueSummary({ queue }) {
  const o = queue.overcrowding
  return (
    <section className="box panel" aria-label="Queue summary">
      <div className="queue-head">
        <h2 className="form__title">{queue.department.name}</h2>
        <span className={`badge badge--${COLORS[o.status]}`}>
          {o.label} · {o.waitingCount}/{o.capacity}
        </span>
      </div>
      <dl className="stats">
        <div>
          <dt>Waiting</dt>
          <dd>{queue.waitingCount}</dd>
        </div>
        <div>
          <dt>Wait for a new patient</dt>
          <dd>~{queue.estimatedWaitMinutes} min</dd>
        </div>
        <div>
          <dt>Avg consult</dt>
          <dd>{queue.avgConsultMinutes} min</dd>
        </div>
      </dl>
      <p>
        <b>Now serving:</b> {queue.nowServing.length ? queue.nowServing.map((n) => `${n.tokenNumber} (${n.room})`).join(', ') : '—'}
      </p>
      <p>
        <b>Next:</b> {queue.nextTokens.length ? queue.nextTokens.join(', ') : '—'}
      </p>
      <ul className="doc-list">
        {queue.doctors.map((d) => (
          <li key={d.name} className={`doc doc--${d.state}`}>
            <strong>{d.name}</strong> · {d.room} · {d.state.replace('_', ' ')}
            {d.state === 'running_late' && ` (${d.delayMinutes} min)`}
          </li>
        ))}
      </ul>
    </section>
  )
}
