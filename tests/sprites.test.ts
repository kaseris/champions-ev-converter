import { describe, expect, it } from 'vitest'
import { sprite_id, sprite_urls } from '../src/sprites'

describe('sprite ids', () => {
  it.each([
    ['Incineroar', 'incineroar'],
    ['Urshifu-Rapid-Strike', 'urshifu-rapidstrike'],
    ['Ninetales-Alola', 'ninetales-alola'],
    ['Garchomp-Mega', 'garchomp-mega'],
    ['Mr. Mime', 'mrmime'],
    ['Mr. Mime-Galar', 'mrmime-galar'],
    ['Ho-Oh', 'hooh'],
    ['Kommo-o', 'kommoo'],
    ['Chien-Pao', 'chienpao'],
    ['Flabébé', 'flabebe'],
    ['Type: Null', 'typenull'],
    ['Farfetch’d', 'farfetchd'],
    ['Tauros-Paldea-Aqua', 'tauros-paldeaaqua']
  ])('%s -> %s', (species, id) => {
    expect(sprite_id(species)).toBe(id)
  })

  it('uses the shiny folders for shiny Pokémon', () => {
    expect(sprite_urls('Kommo-o', true)).toEqual([
      'https://play.pokemonshowdown.com/sprites/home-shiny/kommoo.png',
      'https://play.pokemonshowdown.com/sprites/gen5-shiny/kommoo.png'
    ])
  })

  it('prefers HOME sprites with a gen5 fallback', () => {
    expect(sprite_urls('Incineroar')).toEqual([
      'https://play.pokemonshowdown.com/sprites/home/incineroar.png',
      'https://play.pokemonshowdown.com/sprites/gen5/incineroar.png'
    ])
  })
})
