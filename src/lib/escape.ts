/** Lets optional modules claim the Escape key. A handler returns true when it closed something. */
type EscapeHandler = () => boolean

const handlers = new Set<EscapeHandler>()

export const registerEscape = (fn: EscapeHandler) => {
  handlers.add(fn)
  return () => {
    handlers.delete(fn)
  }
}

export const runEscapeHandlers = () => {
  for (const h of handlers) if (h()) return true
  return false
}
