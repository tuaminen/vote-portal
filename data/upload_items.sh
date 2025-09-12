#!/usr/bin/env bash
set -euo pipefail

HOST="http://localhost:8080"

# Delete all (ignore error if none exist)
curl -fsS -X DELETE "$HOST/items" || true

post() {
  # usage: post "description text" image.png
  curl -fsS -X POST "$HOST/items" \
    --form-string "description=$1" \
    -F "image=@$2"
}

post 'Lautapeli at toimisto/Lategame/Taverna' 'lautapeli.png'
post 'Save file -visiitti https://www.savefile.fi' 'savefile.png'
post 'Hervanta tour (ratikalla Hervantaan, Kultainen apina jne.)' 'herwood.png'
post 'Pispala tour (Pulteri, Vastavirta, Kujakolli)' 'pispala.png'
post 'ZBase (arcade, baaritiski) https://zbase.fi/tampere/' 'zbase.png'
# post 'Counter Strike' 'counterstrike.png'
post 'Ikuri Arcade https://www.ikuriarcade.com/' 'ikuriarcade.png'
post 'Pinball Union https://pinballunion.fi/' 'pinball_union.png'
post 'Pubivisailua https://pubivisat.fi/tampere' 'pub_quiz.png'
post 'Pubikierros (Kahdet kasvot,Ohranjyvä,..)' 'pubcrawl.png'
post 'Karaoke (Tiikerihai/..)' 'karaoke.png'
post 'LANit / peli-ilta toimistolla' 'gaming.png'
post 'Sivuluisua https://www.icerange.fi/' 'icerange.png'
post 'Space Bowling https://www.spacebowling.fi/tampere/' 'bowling.png'
