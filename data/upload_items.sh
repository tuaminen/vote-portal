#!/usr/bin/env bash
set -euo pipefail

HOST="http://localhost:8080"

# Delete all (ignore error if none exist)
curl -fsS -X DELETE "$HOST/items" || true

post() {
  # usage: post "description text" image.jpg
  curl -fsS -X POST "$HOST/items" \
    --form-string "description=$1" \
    -F "image=@$2"
}

post 'Lautapeli at toimisto/Lategame/Taverna' 'lautapeli.jpg'
post 'Save file -visiitti https://www.savefile.fi' 'savefile.jpg'
post 'Hervanta tour (ratikalla Hervantaan, Kultainen apina jne.)' 'herwood.jpg'
post 'Pispala tour (Pulteri, Vastavirta, Kujakolli)' 'pispala.jpg'
post 'ZBase (arcade, baaritiski) https://zbase.fi/tampere/' 'zbase.jpg'
# post 'Counter Strike' 'counterstrike.jpg'
post 'Ikuri Arcade https://www.ikuriarcade.com/' 'ikuriarcade.jpg'
post 'Pinball Union https://pinballunion.fi/' 'pinball_union.jpg'
post 'Pubivisailua https://pubivisat.fi/tampere' 'pub_quiz.jpg'
post 'Pubikierros (Kahdet kasvot,Ohranjyvä,..)' 'pubcrawl.jpg'
post 'Karaoke' 'karaoke.jpg'
post 'LANit / peli-ilta toimistolla' 'gaming.jpg'
#post 'Sivuluisua https://www.icerange.fi/' 'icerange.jpg'
post 'Space Bowling https://www.spacebowling.fi/tampere/' 'bowling.jpg'
