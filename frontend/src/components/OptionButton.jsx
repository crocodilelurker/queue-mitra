/** Large touch-friendly option. `tone="danger"` is the red emergency pill from the reference. */
export default function OptionButton({ tone, children, ...props }) {
  return (
    <button type="button" className={`option${tone ? ` option--${tone}` : ''}`} {...props}>
      {children}
    </button>
  )
}
