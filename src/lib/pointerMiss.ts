/** Lets optional modules react to canvas clicks that did not hit any marker. */
type MissHandler = (event: MouseEvent) => void

const handlers = new Set<MissHandler>()

export const onCanvasMiss = (fn: MissHandler) => {
  handlers.add(fn)
  return () => {
    handlers.delete(fn)
  }
}

export const emitCanvasMiss = (event: MouseEvent) => handlers.forEach((h) => h(event))
