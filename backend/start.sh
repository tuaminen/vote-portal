#ng serve
export DOCKER_BUILDKIT=0

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif docker-compose version 2>/dev/null | grep -qi "version v2"; then
  COMPOSE="docker-compose"
else
  echo "Error: Docker Compose v2 is required (run via 'docker compose')." >&2
  echo "Install docker-compose-v2 (Ubuntu) or docker-compose-plugin (Docker repo) and retry." >&2
  exit 1
fi

$COMPOSE down --remove-orphans --volumes

$COMPOSE build --no-cache

if [ "${DETACH:-0}" = "1" ]; then
  $COMPOSE up -d
else
  $COMPOSE up
fi

# API: http://localhost:8080

