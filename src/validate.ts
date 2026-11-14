import type { Dex } from './dex'
import { invalid_spread_parts, type PokemonSet } from './paste'
import { to_id } from './sprites'

export const NATURES = [
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed', 'Impish', 'Lax',
  'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest', 'Mild', 'Quiet', 'Bashful', 'Rash',
  'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'
]

export const TERA_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Flying',
  'Ground', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar'
]

// Line keys Showdown or PKHeX Auto-Legality Mod understand
export const KNOWN_KEYS = [
  'Ability', 'Level', 'Shiny', 'Happiness', 'Tera Type', 'EVs', 'IVs', 'Hidden Power', 'Dynamax Level',
  'Gigantamax', 'Pokeball', 'Ball', 'OT', 'OTGender', 'TID', 'SID', 'Language'
]

// ALM batch-editor instructions such as ".Nickname=Foo" or "=Species=25"
const BATCH_LINE = /^[.=!~]/

export interface Validation {
  errors: string[]
  warnings: string[]
}

export function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length]
}

export function suggest(input: string, names: Iterable<string>): string | null {
  const id = to_id(input)
  const max_distance = id.length > 8 ? 3 : 2
  let best: string | null = null
  let best_distance = Infinity
  for (const name of names) {
    const distance = levenshtein(id, to_id(name))
    if (distance < best_distance) {
      best = name
      best_distance = distance
    }
  }
  return best_distance <= max_distance ? best : null
}

function hint(input: string, names: Iterable<string>): string {
  const match = suggest(input, names)
  return match ? ` Did you mean "${match}"?` : ''
}

function find(list: string[], value: string): string | undefined {
  return list.find(item => to_id(item) === to_id(value))
}

export function validate_set(set: PokemonSet, dex: Dex | null): Validation {
  const errors: string[] = []
  const warnings: string[] = []
  const species = dex?.species.get(to_id(set.species))
  const item = set.header.split(' @ ')[1]?.trim()

  if (dex && !species) errors.push(`Unknown Pokémon "${set.species}".${hint(set.species, [...dex.species.values()].map(entry => entry.name))}`)
  if (dex && item && !dex.items.has(to_id(item))) errors.push(`Unknown item "${item}".${hint(item, dex.items.values())}`)

  for (const line of set.lines) {
    if (BATCH_LINE.test(line)) continue

    if (line.startsWith('-')) {
      if (!dex) continue
      for (const move of line.slice(1).split('/').map(part => part.trim()).filter(Boolean)) {
        if (!dex.moves.has(to_id(move))) errors.push(`Unknown move "${move}".${hint(move, dex.moves.values())}`)
      }
      continue
    }

    const nature = line.match(/^(.+?)\s+Nature$/i)
    if (nature) {
      if (!find(NATURES, nature[1])) errors.push(`Unknown nature "${nature[1]}".${hint(nature[1], NATURES)}`)
      continue
    }

    const keyed = line.match(/^([^:]+):\s*(.*)$/)
    if (!keyed) {
      warnings.push(`Unrecognised line "${line}".`)
      continue
    }
    const [, raw_key, value] = keyed
    const key = find(KNOWN_KEYS, raw_key.trim())
    if (!key) {
      warnings.push(`Unknown line "${line}". Showdown and PKHeX may ignore it.${hint(raw_key, KNOWN_KEYS)}`)
      continue
    }

    if (key === 'Ability' && dex) {
      const ability = dex.abilities.get(to_id(value))
      if (!ability) {
        errors.push(`Unknown ability "${value}".${hint(value, dex.abilities.values())}`)
      } else if (species && !species.abilities.some(name => to_id(name) === to_id(ability))) {
        errors.push(`${ability} isn't one of ${species.name}'s abilities (${species.abilities.join(', ')}).`)
      }
    }
    if (key === 'Tera Type' && !find(TERA_TYPES, value)) {
      errors.push(`Unknown Tera type "${value}".${hint(value, TERA_TYPES)}`)
    }
    if (key === 'IVs') {
      for (const part of invalid_spread_parts(line)) warnings.push(`Couldn't read IVs part "${part}"; it was ignored.`)
    }
  }

  for (const part of set.ev_line ? invalid_spread_parts(set.ev_line) : []) {
    warnings.push(`Couldn't read EVs part "${part}"; it was ignored.`)
  }
  return { errors, warnings }
}
