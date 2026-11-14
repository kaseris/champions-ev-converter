import { describe, expect, it } from 'vitest'
import { convert_spread } from '../src/convert'
import { extras_to_lines, is_shiny, merge_extras, validate_extras } from '../src/extras'
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

  it('removes held items when asked, keeping nickname and gender', () => {
    const [, chomp] = parse_team(TEAM)
    const text = serialize_set(chomp, chomp.spread, [], true)
    expect(text.split('\n')[0]).toBe('Chompy (Garchomp) (F)')
    expect(serialize_set(chomp, chomp.spread, []).split('\n')[0]).toBe('Chompy (Garchomp) (F) @ Life Orb')
  })

  it('detects shiny from trainer details or the paste itself', () => {
    expect(is_shiny(merge_extras({}, { Shiny: 'Yes' }), [])).toBe(true)
    expect(is_shiny(merge_extras({ Shiny: 'Yes' }, {}), [])).toBe(true)
    expect(is_shiny({}, ['Ability: Intimidate', 'Shiny: Yes'])).toBe(true)
    expect(is_shiny({}, ['Ability: Intimidate'])).toBe(false)
  })

  it('omits empty extras', () => {
    expect(extras_to_lines({ OT: '', TID: ' ' })).toEqual([])
  })

  it('validates Gen 7+ trainer ids (6-digit TID, 4-digit SID) by default', () => {
    expect(validate_extras({ TID: '123456', SID: '4294' })).toEqual([])
    expect(validate_extras({ TID: '1000000', SID: '4295' })).toHaveLength(2)
    expect(validate_extras({ SID: 'abc' })).toHaveLength(1)
  })

  it('validates Gen 3-6 trainer ids as 0-65535', () => {
    expect(validate_extras({ TID: '65535', SID: '12345' }, 'gen3')).toEqual([])
    expect(validate_extras({ TID: '123456' }, 'gen3')).toHaveLength(1)
  })
})
