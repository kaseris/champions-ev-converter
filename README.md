# Champions EV Converter

Import a team from Pokepaste (or pasted Showdown text), convert spreads between Pokémon Champions stat points and regular EVs, add optional trainer details, and export Showdown text that PKHeX + Auto-Legality Mod can import.

## Run

```bash
npm install
npm run dev          # browser, http://localhost:5173
npm run electron:dev # desktop app with hot reload
npm run electron     # build, then open the desktop app
npm test
```

## Conversion

- 1 SP = 8 EVs, except the first point which is 4 (32 SP = 252 EVs). This matches level-50 stat math.
- Champions → regular: 66 SP can produce up to 516 EVs when four or fewer stats are invested. The converter warns and removes EVs from the lowest invested stat until the total is at most 510.
- Regular → Champions: EVs that don't land on an SP boundary are rounded down and reported; totals above 66 SP are clipped the same way.

## Trainer details

OT, OTGender, TID, SID, Language, Ball and Shiny are written as `Key: Value` lines (Auto-Legality Mod format), team-wide or per Pokémon. Empty fields are left out.

Fetching a pokepast.es URL works in the desktop app. In a browser the request may be blocked by CORS; paste the text instead.
