import { describe, expect, it } from 'vitest'
import { move_pool, parse_item_names } from '../src/dex'
import { DEX, ITEMS_JS, LEARNSETS } from './fixtures'

describe('dex', () => {
  it('reads item names from the items.js module without evaluating it', () => {
    expect(parse_item_names(ITEMS_JS)).toEqual(['Sitrus Berry', 'Life Orb', 'Choice Scarf'])
  })

  it('indexes species, moves, items and abilities by id', () => {
    expect(DEX.species.get('urshifurapidstrike')?.name).toBe('Urshifu-Rapid-Strike')
    expect(DEX.moves.get('fakeout')).toBe('Fake Out')
    expect(DEX.items.get('lifeorb')).toBe('Life Orb')
    expect([...DEX.abilities.values()]).toEqual(['Blaze', 'Intimidate', 'Sand Veil', 'Rough Skin', 'Sand Force', 'Levitate', 'Unseen Fist'])
  })

  describe('move_pool', () => {
    const pool = (id: string) => move_pool(DEX, LEARNSETS, id)

    it('inherits moves from pre-evolutions', () => {
      expect(pool('incineroar')?.moves).toEqual(new Set(['knockoff', 'protect', 'partingshot', 'fakeout', 'ember']))
    })

    it('uses the base form for forms without their own learnset', () => {
      expect(pool('garchompmega')?.moves).toEqual(new Set(['earthquake', 'protect']))
    })

    it('merges a changed form with the species it changes from', () => {
      expect(pool('rotomwash')?.moves).toEqual(new Set(['hydropump', 'thunderbolt', 'protect']))
    })

    it('keeps only gen 9 moves when the species has gen 9 data', () => {
      expect(pool('incineroar')?.gen9).toBe(true)
      expect(pool('incineroar')?.moves.has('hiddenpower')).toBe(false)
    })

    it('falls back to every generation when there is no gen 9 data', () => {
      expect(pool('oldmon')).toEqual({ moves: new Set(['ember']), gen9: false })
    })

    it('returns null for a species with no learnset data at all', () => {
      expect(pool('urshifurapidstrike')).toBeNull()
    })
  })
})
