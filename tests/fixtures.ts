import { build_dex, build_learnsets } from '../src/dex'

export const POKEDEX = {
  litten: { name: 'Litten', abilities: { 0: 'Blaze', H: 'Intimidate' } },
  torracat: { name: 'Torracat', abilities: { 0: 'Blaze', H: 'Intimidate' }, prevo: 'Litten' },
  incineroar: { name: 'Incineroar', abilities: { 0: 'Blaze', H: 'Intimidate' }, prevo: 'Torracat' },
  garchomp: { name: 'Garchomp', abilities: { 0: 'Sand Veil', H: 'Rough Skin' } },
  garchompmega: { name: 'Garchomp-Mega', abilities: { 0: 'Sand Force' }, baseSpecies: 'Garchomp' },
  rotom: { name: 'Rotom', abilities: { 0: 'Levitate' } },
  rotomwash: { name: 'Rotom-Wash', abilities: { 0: 'Levitate' }, baseSpecies: 'Rotom', changesFrom: 'Rotom' },
  oldmon: { name: 'Oldmon', abilities: { 0: 'Blaze' } },
  urshifurapidstrike: { name: 'Urshifu-Rapid-Strike', abilities: { 0: 'Unseen Fist' } }
}

export const MOVES = {
  fakeout: { name: 'Fake Out' },
  knockoff: { name: 'Knock Off' },
  earthquake: { name: 'Earthquake' },
  protect: { name: 'Protect' },
  hiddenpowerfire: { name: 'Hidden Power Fire' },
  partingshot: { name: 'Parting Shot' },
  spore: { name: 'Spore' },
  hydropump: { name: 'Hydro Pump' },
  thunderbolt: { name: 'Thunderbolt' },
  ember: { name: 'Ember' }
}

export const ITEMS_JS = 'exports.BattleItems = {sitrusberry:{name:"Sitrus Berry",spritenum:448,fling:{basePower:10},num:158},lifeorb:{name:"Life Orb",num:270},choicescarf:{name:"Choice Scarf",num:287}};'

export const DEX = build_dex(POKEDEX, MOVES, ITEMS_JS)

export const LEARNSETS = build_learnsets({
  litten: { learnset: { partingshot: ['9L1'], fakeout: ['9E'], ember: ['9L1'] } },
  incineroar: { learnset: { knockoff: ['9M'], protect: ['9M'], hiddenpower: ['7M'] } },
  garchomp: { learnset: { earthquake: ['9M'], protect: ['9M'] } },
  rotom: { learnset: { thunderbolt: ['9M'], protect: ['9M'] } },
  rotomwash: { learnset: { hydropump: ['9R'] } },
  oldmon: { learnset: { ember: ['8L1'] } }
})
