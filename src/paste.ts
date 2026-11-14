import { STATS, empty_spread, type Spread, type Stat } from './convert'

export interface PokemonSet {
  header: string
  species: string
  lines: string[]
  spread: Spread
}

const STAT_ALIASES: Record<string, Stat> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe'
}

const EV_LINE = /^EVs:/i

export function pokepaste_raw_url(input: string): string | null {
  const match = input.trim().match(/^(?:https?:\/\/)?pokepast\.es\/([a-z0-9]+)/i)
  return match ? `https://pokepast.es/${match[1]}/raw` : null
}

export function parse_species(header: string): string {
  const without_item = header.split(' @ ')[0].trim()
  const without_gender = without_item.replace(/\s\((M|F)\)$/, '')
  const nicknamed = without_gender.match(/\(([^()]+)\)$/)
  return (nicknamed ? nicknamed[1] : without_gender).trim()
}

export function parse_spread_line(line: string): Spread {
  const spread = empty_spread()
  for (const part of line.replace(EV_LINE, '').split('/')) {
    const match = part.trim().match(/^(\d+)\s+(\w+)$/)
    const stat = match && STAT_ALIASES[match[2].toLowerCase()]
    if (match && stat) spread[stat] = Number(match[1])
  }
  return spread
}

export function format_spread_line(spread: Spread): string | null {
  const parts = STATS.filter(stat => spread[stat] > 0).map(stat => `${spread[stat]} ${stat}`)
  return parts.length ? `EVs: ${parts.join(' / ')}` : null
}

export function parse_team(text: string): PokemonSet[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map(block => block.split('\n').map(line => line.trim()).filter(Boolean))
    .filter(lines => lines.length > 0)
    .map(([header, ...lines]) => {
      const ev_line = lines.find(line => EV_LINE.test(line))
      return {
        header,
        species: parse_species(header),
        lines: lines.filter(line => !EV_LINE.test(line)),
        spread: ev_line ? parse_spread_line(ev_line) : empty_spread()
      }
    })
}

// Rebuilds a set in Showdown order: header, Ability/Level/etc, extras, EVs, the rest (nature, IVs, moves)
export function serialize_set(set: PokemonSet, spread: Spread, extra_lines: string[]): string {
  const extra_keys = new Set(extra_lines.map(line => line.split(':')[0].toLowerCase()))
  const kept = set.lines.filter(line => !extra_keys.has(line.split(':')[0].toLowerCase()))
  const split_at = kept.findIndex(line => /Nature$/i.test(line) || /^IVs:/i.test(line) || line.startsWith('-'))
  const head = split_at === -1 ? kept : kept.slice(0, split_at)
  const tail = split_at === -1 ? [] : kept.slice(split_at)
  const ev_line = format_spread_line(spread)
  return [set.header, ...head, ...extra_lines, ...(ev_line ? [ev_line] : []), ...tail].join('\n')
}
