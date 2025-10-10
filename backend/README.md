

## Check votes
docker exec -it backend_db_1 /bin/bash
psql -U postgres -d votes -c "SELECT * FROM votes;" > out.txt

