export const STATS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'] as const
export type Stat = typeof STATS[number]
export type Spread = Record<Stat, number>
export type Direction = 'champions_to_regular' | 'regular_to_champions'

export const MAX_SP_PER_STAT = 32
export const MAX_SP_TOTAL = 66
export const MAX_EV_PER_STAT = 252
export const MAX_EV_TOTAL = 510

export type ConversionStatus = 'ok' | 'warning' | 'error'

// warnings: the converter fixed something (rounding, clipping); errors: the input spread itself is invalid
export interface ConversionResult {
  spread: Spread
  warnings: string[]
  errors: string[]
  status: ConversionStatus
}

function result(spread: Spread, warnings: string[], errors: string[]): ConversionResult {
  const status: ConversionStatus = errors.length ? 'error' : warnings.length ? 'warning' : 'ok'
  return { spread, warnings, errors, status }
}

// Adds checks from outside the converter (e.g. paste validation) and recomputes the status
export function with_notes(base: ConversionResult, extra: { errors: string[]; warnings: string[] }): ConversionResult {
  return result(base.spread, [...extra.warnings, ...base.warnings], [...extra.errors, ...base.errors])
}

export function empty_spread(): Spread {
  return { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 }
}

export function total(spread: Spread): number {
  return STATS.reduce((sum, stat) => sum + spread[stat], 0)
}

// At level 50 one stat point equals one visible stat point: the first one costs 4 EVs, every next one 8
export function sp_to_ev(sp: number): number {
  const clamped = Math.min(Math.max(sp, 0), MAX_SP_PER_STAT)
  return clamped === 0 ? 0 : 8 * clamped - 4
}

export function ev_to_sp(ev: number): number {
  const clamped = Math.min(Math.max(ev, 0), MAX_EV_PER_STAT)
  return Math.min(MAX_SP_PER_STAT, Math.floor((clamped + 4) / 8))
}

// Largest EV value of the form 8n - 4 (or 0) that is <= ev, so no EVs are wasted after clipping
function efficient_ev_floor(ev: number): number {
  return ev < 4 ? 0 : sp_to_ev(ev_to_sp(ev))
}

function lowest_invested_stat(spread: Spread): Stat | null {
  let lowest: Stat | null = null
  for (const stat of STATS) {
    if (spread[stat] > 0 && (lowest === null || spread[stat] < spread[lowest])) lowest = stat
  }
  return lowest
}

function format_spread(spread: Spread): string {
  return STATS.filter(stat => spread[stat] > 0).map(stat => `${spread[stat]} ${stat}`).join(' / ') || 'none'
}

function clip_evs(spread: Spread, warnings: string[]): Spread {
  const clipped = { ...spread }
  const before = total(clipped)
  while (total(clipped) > MAX_EV_TOTAL) {
    const stat = lowest_invested_stat(clipped)!
    const excess = total(clipped) - MAX_EV_TOTAL
    clipped[stat] = efficient_ev_floor(Math.max(clipped[stat] - excess, 0))
  }
  warnings.push(
    `Total ${before} EVs exceeds the ${MAX_EV_TOTAL} limit. Clipped to ${total(clipped)}: ${format_spread(clipped)}.`
  )
  return clipped
}

function clip_sp(spread: Spread, warnings: string[]): Spread {
  const clipped = { ...spread }
  const before = total(clipped)
  while (total(clipped) > MAX_SP_TOTAL) {
    const stat = lowest_invested_stat(clipped)!
    clipped[stat] = Math.max(clipped[stat] - (total(clipped) - MAX_SP_TOTAL), 0)
  }
  warnings.push(
    `Total ${before} SP exceeds the ${MAX_SP_TOTAL} limit. Clipped to ${total(clipped)}: ${format_spread(clipped)}.`
  )
  return clipped
}

export function convert_spread(input: Spread, direction: Direction): ConversionResult {
  const warnings: string[] = []
  const errors: string[] = []
  const spread = empty_spread()
  if (total(input) === 0) errors.push('No spread found: every stat is 0.')

  if (direction === 'champions_to_regular') {
    for (const stat of STATS) {
      if (input[stat] > MAX_SP_PER_STAT) {
        errors.push(`${stat}: ${input[stat]} SP is above the ${MAX_SP_PER_STAT} per-stat cap, treated as ${MAX_SP_PER_STAT}.`)
      }
      spread[stat] = sp_to_ev(input[stat])
    }
    if (total(input) > MAX_SP_TOTAL) {
      errors.push(`Input has ${total(input)} SP, more than the ${MAX_SP_TOTAL} Champions allows.`)
    }
    return result(total(spread) > MAX_EV_TOTAL ? clip_evs(spread, warnings) : spread, warnings, errors)
  }

  const wasted: string[] = []
  for (const stat of STATS) {
    if (input[stat] > MAX_EV_PER_STAT) {
      errors.push(`${stat}: ${input[stat]} EVs is above the ${MAX_EV_PER_STAT} per-stat cap, treated as ${MAX_EV_PER_STAT}.`)
    }
    spread[stat] = ev_to_sp(input[stat])
    const used = sp_to_ev(spread[stat])
    const capped_input = Math.min(input[stat], MAX_EV_PER_STAT)
    if (capped_input !== used) wasted.push(`${stat} ${capped_input}→${used}`)
  }
  if (wasted.length) {
    warnings.push(`EVs not on an SP boundary were rounded: ${wasted.join(', ')}.`)
  }
  if (total(input) > MAX_EV_TOTAL) {
    errors.push(`Input has ${total(input)} EVs, more than the ${MAX_EV_TOTAL} regular games allow.`)
  }
  return result(total(spread) > MAX_SP_TOTAL ? clip_sp(spread, warnings) : spread, warnings, errors)
}
