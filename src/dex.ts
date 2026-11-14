import { to_id } from './sprites'

const DATA_HOST = 'https://play.pokemonshowdown.com/data'

export interface SpeciesEntry {
  name: string
  abilities: string[]
  // Ids whose learnsets this species also inherits: its pre-evolution and the base form it changes from
  inherits: string[]
}

// species id -> move id -> sources such as "9L1" (gen 9, level up) or "8M" (gen 8, TM)
export type Learnsets = Map<string, Map<string, string[]>>

export interface MovePool {
  moves: Set<string>
  // True when the pool is Scarlet/Violet only; false when the species has no gen 9 data and all generations were used
  gen9: boolean
}

export interface Dex {
  species: Map<string, SpeciesEntry>
  moves: Map<string, string>
  items: Map<string, string>
  abilities: Map<string, string>
}

type PokedexData = Record<string, {
  name: string
  abilities?: Record<string, string>
  prevo?: string
  baseSpecies?: string
  changesFrom?: string
}>
type LearnsetsData = Record<string, { learnset?: Record<string, string[]> }>
type MovesData = Record<string, { name: string }>

// items.js is a JS module (exports.BattleItems = {...}); read names with a regex instead of evaluating it
export function parse_item_names(source: string): string[] {
  return [...source.matchAll(/name:"((?:[^"\\]|\\.)+)"/g)].map(match => match[1])
}

export function build_dex(pokedex: PokedexData, moves: MovesData, items_source: string): Dex {
  const species = new Map<string, SpeciesEntry>()
  const abilities = new Map<string, string>()
  for (const entry of Object.values(pokedex)) {
    const entry_abilities = Object.values(entry.abilities ?? {})
    const inherits = [entry.prevo, entry.changesFrom ?? entry.baseSpecies].filter((name): name is string => !!name).map(to_id)
    species.set(to_id(entry.name), { name: entry.name, abilities: entry_abilities, inherits })
    for (const ability of entry_abilities) abilities.set(to_id(ability), ability)
  }
  const move_names = new Map(Object.values(moves).map(move => [to_id(move.name), move.name]))
  const item_names = new Map(parse_item_names(items_source).map(name => [to_id(name), name]))
  return { species, moves: move_names, items: item_names, abilities }
}

export function build_learnsets(data: LearnsetsData): Learnsets {
  return new Map(
    Object.entries(data)
      .filter(([, entry]) => entry.learnset)
      .map(([id, entry]) => [id, new Map(Object.entries(entry.learnset!))])
  )
}

// Showdown lists each move only on the earliest species in a line that learns it, and forms such as
// Megas have no learnset of their own, so walk pre-evolutions and base forms and merge their moves
export function move_pool(dex: Dex, learnsets: Learnsets, species_id: string): MovePool | null {
  const all = new Set<string>()
  const gen9 = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    for (const [move, sources] of learnsets.get(id) ?? []) {
      all.add(move)
      if (sources.some(source => source.startsWith('9'))) gen9.add(move)
    }
    for (const parent of dex.species.get(id)?.inherits ?? []) visit(parent)
  }
  visit(species_id)
  if (!all.size) return null
  return gen9.size ? { moves: gen9, gen9: true } : { moves: all, gen9: false }
}

// Hidden Power [Fire] is learned as plain Hidden Power
export function learnset_move_id(move_id: string): string {
  return move_id.startsWith('hiddenpower') ? 'hiddenpower' : move_id
}

async function fetch_ok(path: string): Promise<Response> {
  const response = await fetch(`${DATA_HOST}/${path}`)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`)
  return response
}

let cached: Promise<Dex> | null = null

export function load_dex(): Promise<Dex> {
  cached ??= Promise.all([
    fetch_ok('pokedex.json').then(response => response.json()),
    fetch_ok('moves.json').then(response => response.json()),
    fetch_ok('items.js').then(response => response.text())
  ])
    .then(([pokedex, moves, items]) => build_dex(pokedex, moves, items))
    .catch(error => {
      // Allow a retry on the next import instead of caching the failure
      cached = null
      throw error
    })
  return cached
}

let cached_learnsets: Promise<Learnsets> | null = null

// Loaded separately from the names (≈380 KB compressed) so a failure only skips the learnability hint
export function load_learnsets(): Promise<Learnsets> {
  cached_learnsets ??= fetch_ok('learnsets.json')
    .then(response => response.json())
    .then(build_learnsets)
    .catch(error => {
      cached_learnsets = null
      throw error
    })
  return cached_learnsets
}
