import { useEffect, useId, useRef } from 'react'

/** Accessible modal built on <dialog> (focus trap, Esc to close). Children render only while open. */
export default function Modal({ open, onClose, title, variant, children }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal box${variant ? ` modal--${variant}` : ''}`}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className="modal__body">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          {children}
        </div>
      )}
    </dialog>
  )
}
