import { describe, expect, it } from 'vitest'
import { convert_spread } from '../src/convert'
import { extras_to_lines, merge_extras, validate_extras } from '../src/extras'
import { parse_species, parse_team, pokepaste_raw_url, serialize_set } from '../src/paste'

const TEAM = `Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
Tera Type: Grass
EVs: 32 HP / 2 Def / 32 SpD
Careful Nature
- Fake Out
- Knock Off

Chompy (Garchomp) (F) @ Life Orb
Ability: Rough Skin
EVs: 1 HP / 32 Atk / 32 Spe
Jolly Nature
- Earthquake
`

describe('parsing', () => {
  it('reads species from headers', () => {
    expect(parse_species('Incineroar @ Sitrus Berry')).toBe('Incineroar')
    expect(parse_species('Chompy (Garchomp) (F) @ Life Orb')).toBe('Garchomp')
    expect(parse_species('Urshifu-Rapid-Strike (M)')).toBe('Urshifu-Rapid-Strike')
  })

  it('parses sets and spreads', () => {
    const team = parse_team(TEAM)
    expect(team.map(set => set.species)).toEqual(['Incineroar', 'Garchomp'])
    expect(team[0].spread).toMatchObject({ HP: 32, Def: 2, SpD: 32 })
  })

  it('builds pokepaste raw urls', () => {
    expect(pokepaste_raw_url('https://pokepast.es/abc123')).toBe('https://pokepast.es/abc123/raw')
    expect(pokepaste_raw_url('pokepast.es/abc123/raw')).toBe('https://pokepast.es/abc123/raw')
    expect(pokepaste_raw_url('Incineroar')).toBeNull()
  })
})

describe('serializing', () => {
  it('writes converted EVs and extras in Showdown order', () => {
    const [set] = parse_team(TEAM)
    const { spread } = convert_spread(set.spread, 'champions_to_regular')
    const extras = extras_to_lines(merge_extras({ OT: 'Mike', TID: '12345' }, { SID: '54321' }))
    expect(serialize_set(set, spread, extras)).toBe(`Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
Tera Type: Grass
OT: Mike
TID: 12345
SID: 54321
EVs: 252 HP / 4 Def / 252 SpD
Careful Nature
- Fake Out
- Knock Off`)
  })

  it('omits empty extras', () => {
    expect(extras_to_lines({ OT: '', TID: ' ' })).toEqual([])
  })

  it('validates trainer ids', () => {
    expect(validate_extras({ TID: '70000', SID: 'abc' })).toHaveLength(2)
    expect(validate_extras({ TID: '12345' })).toEqual([])
  })
})
