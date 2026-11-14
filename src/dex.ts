import { to_id } from './sprites'

const DATA_HOST = 'https://play.pokemonshowdown.com/data'

export interface SpeciesEntry {
  name: string
  abilities: string[]
}

export interface Dex {
  species: Map<string, SpeciesEntry>
  moves: Map<string, string>
  items: Map<string, string>
  abilities: Map<string, string>
}

type PokedexData = Record<string, { name: string; abilities?: Record<string, string> }>
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
    species.set(to_id(entry.name), { name: entry.name, abilities: entry_abilities })
    for (const ability of entry_abilities) abilities.set(to_id(ability), ability)
  }
  const move_names = new Map(Object.values(moves).map(move => [to_id(move.name), move.name]))
  const item_names = new Map(parse_item_names(items_source).map(name => [to_id(name), name]))
  return { species, moves: move_names, items: item_names, abilities }
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
