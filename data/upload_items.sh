#!/bin/bash

set -ex

export HOST=http://localhost:8080

# Delete all
curl -X DELETE $HOST/items

# Insert data
curl -X POST $HOST/items -F "description=Karaoke" -F "image=@karaoke.png"
curl -X POST $HOST/items -F "description=Ikuri Arcade" -F "image=@ikuriarcade.png"
curl -X POST $HOST/items -F "description=Hervanta tour" -F "image=@herwood.png"
curl -X POST $HOST/items -F "description=Pispala tour" -F "image=@pispala.png"
curl -X POST $HOST/items -F "description=ZBase" -F "image=@zbase.png"
curl -X POST $HOST/items -F "description=Counter Strike" -F "image=@counterstrike.png"
curl -X POST $HOST/items -F "description=Pinball Union" -F "image=@pinball_union.png"
curl -X POST $HOST/items -F "description=Save file" -F "image=@savefile.png"
curl -X POST $HOST/items -F "description=Lautapeli (toimisto/Lategame/Taverna)" -F "image=@lautapeli.png"
curl -X POST $HOST/items -F "description=Pubivisa. https://pubivisat.fi/tampere" -F "image=@pub_quiz.png"
curl -X POST $HOST/items -F "description=Pubikierros" -F "image=@pubcrawl.png"
curl -X POST $HOST/items -F "description=LANit / peli-ilta" -F "image=@gaming.png"
curl -X POST $HOST/items -F "description=https://www.icerange.fi/" -F "image=@icerange.png"
curl -X POST $HOST/items -F "description=https://www.spacebowling.fi/tampere/" -F "image=@bowling.png"

