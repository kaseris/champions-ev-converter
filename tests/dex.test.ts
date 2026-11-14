import { describe, expect, it } from 'vitest'
import { parse_item_names } from '../src/dex'
import { DEX, ITEMS_JS } from './fixtures'

describe('dex', () => {
  it('reads item names from the items.js module without evaluating it', () => {
    expect(parse_item_names(ITEMS_JS)).toEqual(['Sitrus Berry', 'Life Orb', 'Choice Scarf'])
  })

  it('indexes species, moves, items and abilities by id', () => {
    expect(DEX.species.get('urshifurapidstrike')?.name).toBe('Urshifu-Rapid-Strike')
    expect(DEX.moves.get('fakeout')).toBe('Fake Out')
    expect(DEX.items.get('lifeorb')).toBe('Life Orb')
    expect([...DEX.abilities.values()]).toEqual(['Blaze', 'Intimidate', 'Sand Veil', 'Rough Skin', 'Unseen Fist'])
  })
})
