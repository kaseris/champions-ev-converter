import { describe, expect, it } from 'vitest'
import { parse_team } from '../src/paste'
import { suggest, validate_set } from '../src/validate'
import { DEX, LEARNSETS } from './fixtures'

const check = (text: string, dex = DEX) => validate_set(parse_team(text)[0], dex)

const VALID = `Incineroar @ Sitrus Berry
Ability: Intimidate
Level: 50
Tera Type: Grass
OT: Mike
.Nickname=Roary
EVs: 32 HP / 2 Def / 32 SpD
IVs: 0 Atk
Careful Nature
- Fake Out
- Knock Off
- Hidden Power [Fire]`

describe('validate_set', () => {
  it('passes a valid set', () => {
    expect(check(VALID)).toEqual({ errors: [], warnings: [] })
  })

  it('flags unknown names with suggestions', () => {
    const { errors } = check(`Incineroarr @ Sitrus Bery
Ability: Intimidat
Tera Type: Grasss
Adamnt Nature
- Fake Ot`)
    expect(errors).toEqual([
      'Unknown Pokémon "Incineroarr". Did you mean "Incineroar"?',
      'Unknown item "Sitrus Bery". Did you mean "Sitrus Berry"?',
      'Unknown ability "Intimidat". Did you mean "Intimidate"?',
      'Unknown Tera type "Grasss". Did you mean "Grass"?',
      'Unknown nature "Adamnt". Did you mean "Adamant"?',
      'Unknown move "Fake Ot". Did you mean "Fake Out"?'
    ])
  })

  it('omits the suggestion when nothing is close', () => {
    expect(check('Incineroar\n- Splash Dance Party').errors).toEqual(['Unknown move "Splash Dance Party".'])
  })

  it('flags an ability the species cannot have', () => {
    expect(check('Incineroar\nAbility: Rough Skin').errors).toEqual([
      "Rough Skin isn't one of Incineroar's abilities (Blaze, Intimidate)."
    ])
  })

  it('checks each alternative in a slashed move line', () => {
    expect(check('Garchomp\n- Earthquake / Protekt').errors).toEqual(['Unknown move "Protekt". Did you mean "Protect"?'])
  })

  it('warns about unknown keys, unreadable lines and spread parts', () => {
    const { errors, warnings } = check(`Garchomp @ Life Orb
Abilty: Rough Skin
Some random text
EVs: 32 Atk / 32 Speed
IVs: 0 Attack`)
    expect(errors).toEqual([])
    expect(warnings).toEqual([
      'Unknown line "Abilty: Rough Skin". Showdown and PKHeX may ignore it. Did you mean "Ability"?',
      'Unrecognised line "Some random text".',
      'Couldn\'t read IVs part "0 Attack"; it was ignored.',
      'Couldn\'t read EVs part "32 Speed"; it was ignored.'
    ])
  })

  it('runs only format checks without Showdown data', () => {
    const result = check(`Notamon @ Fake Item
Ability: Made Up
Adamnt Nature
Abilty: Blaze
- Not A Move`, null as never)
    expect(result.errors).toEqual(['Unknown nature "Adamnt". Did you mean "Adamant"?'])
    expect(result.warnings).toHaveLength(1)
  })
})

describe('suggest', () => {
  it('allows more typos for longer names', () => {
    expect(suggest('Urshfu-Rapd-Strike', ['Urshifu-Rapid-Strike'])).toBe('Urshifu-Rapid-Strike')
    expect(suggest('Xyz', ['Fake Out'])).toBeNull()
  })
})

describe('learnable moves', () => {
  const learn = (text: string) => validate_set(parse_team(text)[0], DEX, LEARNSETS)

  it('accepts moves learned by the species or its pre-evolutions', () => {
    expect(learn('Incineroar\n- Fake Out\n- Parting Shot\n- Knock Off\n- Protect')).toEqual({ errors: [], warnings: [] })
  })

  it('warns, not errors, about moves outside the move pool', () => {
    expect(learn('Garchomp-Mega\n- Earthquake\n- Spore')).toEqual({
      errors: [],
      warnings: ['Garchomp-Mega may not be able to learn Spore in Scarlet/Violet.']
    })
  })

  it('names the fallback when only older generations have data', () => {
    expect(learn('Oldmon\n- Thunderbolt').warnings).toEqual(['Oldmon may not be able to learn Thunderbolt in any game.'])
  })

  it('treats Hidden Power types as Hidden Power', () => {
    expect(learn('Oldmon\n- Hidden Power [Fire]').warnings).toEqual([
      'Oldmon may not be able to learn Hidden Power Fire in any game.'
    ])
  })

  it('skips the check when the species has no learnset data', () => {
    expect(learn('Urshifu-Rapid-Strike\n- Spore').warnings).toEqual([])
  })

  it('skips the check until learnsets have loaded', () => {
    expect(check('Garchomp\n- Spore').warnings).toEqual([])
  })
})
