import { describe, expect, it } from 'vitest'
import { convert_spread, empty_spread, ev_to_sp, sp_to_ev, total, type Spread } from '../src/convert'

const spread = (values: Partial<Spread>): Spread => ({ ...empty_spread(), ...values })

describe('sp/ev mapping', () => {
  it('maps stat points to EVs', () => {
    expect([0, 1, 2, 31, 32, 40].map(sp_to_ev)).toEqual([0, 4, 12, 244, 252, 252])
  })

  it('maps EVs to stat points', () => {
    expect([0, 3, 4, 11, 12, 244, 252, 300].map(ev_to_sp)).toEqual([0, 0, 1, 1, 2, 31, 32, 32])
  })
})

describe('champions to regular', () => {
  it('converts a legal spread without warnings', () => {
    const result = convert_spread(spread({ HP: 32, Atk: 32, Spe: 1 }), 'champions_to_regular')
    expect(result.spread).toEqual(spread({ HP: 252, Atk: 252, Spe: 4 }))
    expect(result.warnings).toEqual([])
  })

  it('clips 66 SP that overflow 510 EVs and warns', () => {
    const result = convert_spread(spread({ HP: 32, Atk: 32, Spe: 2 }), 'champions_to_regular')
    expect(total(result.spread)).toBeLessThanOrEqual(510)
    expect(result.spread).toEqual(spread({ HP: 252, Atk: 252, Spe: 4 }))
    expect(result.warnings[0]).toMatch(/516 EVs exceeds/)
  })

  it('does not overflow when 66 SP cover five or more stats', () => {
    const result = convert_spread(spread({ HP: 11, Atk: 11, Def: 11, SpA: 11, SpD: 11, Spe: 11 }), 'champions_to_regular')
    expect(total(result.spread)).toBe(504)
    expect(result.warnings).toEqual([])
  })

  it('clips a four-stat 66 SP spread (512 EVs) from the lowest stat', () => {
    const result = convert_spread(spread({ HP: 32, Atk: 16, Def: 16, Spe: 2 }), 'champions_to_regular')
    expect(result.spread).toEqual(spread({ HP: 252, Atk: 124, Def: 124, Spe: 4 }))
    expect(result.warnings[0]).toMatch(/512 EVs exceeds/)
  })
})

describe('regular to champions', () => {
  it('converts a standard 252/252/4 spread', () => {
    const result = convert_spread(spread({ HP: 252, Atk: 252, Spe: 4 }), 'regular_to_champions')
    expect(result.spread).toEqual(spread({ HP: 32, Atk: 32, Spe: 1 }))
    expect(result.warnings).toEqual([])
  })

  it('reports EVs that do not land on an SP boundary', () => {
    const result = convert_spread(spread({ HP: 248, Def: 8 }), 'regular_to_champions')
    expect(result.spread).toEqual(spread({ HP: 31, Def: 1 }))
    expect(result.warnings[0]).toMatch(/HP 248→244, Def 8→4/)
  })

  it('clips over 66 SP', () => {
    const result = convert_spread(spread({ HP: 252, Atk: 252, Def: 252 }), 'regular_to_champions')
    expect(total(result.spread)).toBe(66)
    expect(result.warnings.some(w => /exceeds the 66/.test(w))).toBe(true)
  })
})
