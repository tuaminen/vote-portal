# Instructions

## Configuration

### Configure event title (i.e. the date)
* modify ```TOPIC_TITLE``` at ```backend/docker-compose.yml``` 

### Configure voting items
* Modify voting items at ```data/upload_items.sh```
* Generate PNG images for new items using AI or such
* Generate JPGs from PNG by running ```cd data; ./create_jpgs.sh```
* Commit new items to git

### Testing (OPTIONAL): Run backend
* Start backend: ```cd backend; ./start.sh```

### Testing (OPTIONAL): Install data
* Once backend is up, upload items to database using ```cd data; upload_items.sh```

### Testing (OPTIONAL): Start UI
* Start backend: ```cd ui; ./start.sh```

### Deploy to cloud

* We need to use ```https://console.cloud.google.com/compute/instancesDetail/zones/europe-north1-c/instances/vote-portal?project=macro-crane-801```

* Start it:
  ```
  gcloud compute instances start vote-portal \
    --project=macro-crane-801 \
    --zone=europe-north1-c
  ```

* Check the ephemeral IP:
  ```
  gcloud compute instances describe vote-portal \
  --project=macro-crane-801 \
  --zone=europe-north1-c \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
  ```

* Configure it to backend address as API_BASE in file  ```ui/src/app/app.component.ts ```

* Commit and push changes to Git:
  ```
  git add .
  git commit -m "Vote settings xx.xx.xxxx"
  git push
  ```

* Open SSH to VM:
  ```
  * gcloud compute ssh  vote-portal --project=macro-crane-801 --zone=europe-north1-c
    ```

* Update vote-portal repo
  ```
  cd vote-portal
  git stash
  git pull
  ```

* Start backend
  ```
  cd backend
  <modify start.sh by using "COMPOSE up -d" row>
  ./start.sh
  ```

* Upload data
```
  cd data
  ./upl.sh
  ```

* Start UI
  ```
  cd ui
  <modify start.sh by using "COMPOSE up -d" row>
  ./start.sh
  press CTRL-Z, bg
  ```

* Test by opening browser to 
http://<ephemeral_ip>:8081/
