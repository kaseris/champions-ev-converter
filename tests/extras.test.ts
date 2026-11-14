import { describe, expect, it } from 'vitest'
import { extract_extras, split_common } from '../src/extras'

describe('extract_extras', () => {
  it('pulls trainer lines out and keeps the rest in order', () => {
    const { extras, rest } = extract_extras(['Ability: Intimidate', 'OT: Mike', 'tid: 123456', 'Level: 50', 'Language: english', 'Shiny: yes', '- Fake Out'])
    expect(extras).toEqual({ OT: 'Mike', TID: '123456', Language: 'English', Shiny: 'Yes' })
    expect(rest).toEqual(['Ability: Intimidate', 'Level: 50', '- Fake Out'])
  })

  it('drops "Shiny: No" and keeps unusual values as written', () => {
    expect(extract_extras(['Shiny: No', 'Language: ENG', 'OTGender: female'])).toEqual({
      extras: { Language: 'ENG', OTGender: 'Female' },
      rest: []
    })
  })
})

describe('split_common', () => {
  it('moves values shared by every Pokémon to the team and keeps the differences', () => {
    const { team, overrides } = split_common([
      { OT: 'Mike', TID: '123456', Shiny: 'Yes' },
      { OT: 'Mike', TID: '123456' },
      { OT: 'Mike', TID: '654321' }
    ])
    expect(team).toEqual({ OT: 'Mike' })
    expect(overrides).toEqual([{ TID: '123456', Shiny: 'Yes' }, { TID: '123456' }, { TID: '654321' }])
  })

  it('returns nothing shared when a Pokémon lacks the field', () => {
    expect(split_common([{ OT: 'Mike' }, {}]).team).toEqual({})
  })
})
