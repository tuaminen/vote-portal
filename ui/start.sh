#ng serve
export DOCKER_BUILDKIT=0

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

$COMPOSE down --remove-orphans

$COMPOSE build --no-cache

if [ "${DETACH:-0}" = "1" ]; then
  $COMPOSE up -d
else
  $COMPOSE up
fi
