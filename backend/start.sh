#ng serve
export DOCKER_BUILDKIT=0

docker-compose down --remove-orphans

docker-compose build --no-cache

#docker-compose up -d
docker-compose up

# API: http://localhost:8080


