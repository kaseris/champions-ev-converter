import { build_dex } from '../src/dex'

export const POKEDEX = {
  incineroar: { name: 'Incineroar', abilities: { 0: 'Blaze', H: 'Intimidate' } },
  garchomp: { name: 'Garchomp', abilities: { 0: 'Sand Veil', H: 'Rough Skin' } },
  urshifurapidstrike: { name: 'Urshifu-Rapid-Strike', abilities: { 0: 'Unseen Fist' } }
}

export const MOVES = {
  fakeout: { name: 'Fake Out' },
  knockoff: { name: 'Knock Off' },
  earthquake: { name: 'Earthquake' },
  protect: { name: 'Protect' },
  hiddenpowerfire: { name: 'Hidden Power Fire' }
}

export const ITEMS_JS = 'exports.BattleItems = {sitrusberry:{name:"Sitrus Berry",spritenum:448,fling:{basePower:10},num:158},lifeorb:{name:"Life Orb",num:270},choicescarf:{name:"Choice Scarf",num:287}};'

export const DEX = build_dex(POKEDEX, MOVES, ITEMS_JS)
