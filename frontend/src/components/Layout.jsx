import Header from './Header.jsx'
import OfflineBanner from './OfflineBanner.jsx'

/** Shared page frame: offline banner, header and a centered column. */
export default function Layout({ children, wide = false, hideEmergency = false, className = '' }) {
  return (
    <>
      <OfflineBanner />
      <div className="page">
        <Header hideEmergency={hideEmergency} />
        <main className={`main${wide ? ' main--wide' : ''} ${className}`}>{children}</main>
      </div>
    </>
  )
}
