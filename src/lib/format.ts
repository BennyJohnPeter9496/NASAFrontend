const AU_KM = 149_597_871
const LIGHT_SECONDS_PER_AU = 499.005

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatAU(au: number): string {
  if (au < 0.01) return `${au.toFixed(5)} AU`
  if (au < 10) return `${Number(au.toFixed(1))} AU`
  return `${Math.round(au)} AU`
}

export function formatKm(au: number): string {
  const km = au * AU_KM
  if (km >= 1e9) return `${(km / 1e9).toFixed(1)} billion km`
  if (km >= 1e6) return `${Math.round(km / 1e6)} million km`
  return `${Math.round(km / 1e3) * 1e3} km`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatLightTime(au: number): string {
  const s = au * LIGHT_SECONDS_PER_AU
  if (s < 60) return `${s.toFixed(1)} seconds`
  if (s < 3600) return `${Math.round(s / 60)} minutes`
  return `${(s / 3600).toFixed(1)} hours`
}
