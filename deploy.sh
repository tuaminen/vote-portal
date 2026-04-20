# Start Google cloud server and start it using the new settings

set -ex

# We need to use https://console.cloud.google.com/compute/instancesDetail/zones/europe-north1-c/instances/vote-portal?project=macro-crane-801
# Start it:
gcloud compute instances start vote-portal --project=macro-crane-801 --zone=europe-north1-c

# Read its ephemeral IP
export VOTE_IP=$(gcloud compute instances describe vote-portal --project=macro-crane-801 --zone=europe-north1-c --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

# Configure it to backend address as API_BASE
sed -i "s/localhost/${VOTE_IP}/g" ui/src/app/vote.service.ts

# Commit and push changes to git
export TOPIC_TITLE=$(sed -n 's/.*TOPIC_TITLE=\(.*\)/\1/p' backend/docker-compose.yml)
git add .
git commit -m "${TOPIC_TITLE}"
git push

# Log in to server, pull changes, start backend, upload database
gcloud compute ssh vote-portal --project=macro-crane-801 --zone=europe-north1-c -- "cd vote-portal; git stash; git pull; if ! docker compose version >/dev/null 2>&1; then sudo apt-get update; sudo apt-get install -y docker-compose-v2 || sudo apt-get install -y docker-compose-plugin; fi; cd backend; DETACH=1 ./start.sh;"

# Upload items to database
gcloud compute ssh  vote-portal --project=macro-crane-801 --zone=europe-north1-c -- "cd vote-portal/data; ./upload_items.sh"

# Run UI server
gcloud compute ssh vote-portal --project=macro-crane-801 --zone=europe-north1-c -- "cd vote-portal/ui; DETACH=1 ./start.sh;"

# Revert locally your vote.service.ts back to localhost (for the next time)
sed -i 's|http://${VOTE_IP}:8080|http://localhost:8080|g' ui/src/app/vote.service.ts

# Success
echo "Now you can access the portal at http://${VOTE_IP}:8081"

