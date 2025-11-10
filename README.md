# Instructions

## Configuration

### Configure event title (i.e. the date)
* modify ```TOPIC_TITLE``` at ```backend/docker-compose.yml``` 

### Start backend
* Start backend: ```cd backend; ./start.sh```

### Configure voting items
* Modify voting items at ```data/upload_items.sh```
* Generate PNG images for new items using AI or such
* Generate JPGs from PNG by running ```./create_jpgs.sh```
* Once backend is up, upload items to database using ```upload_items.sh```

### Configure UI
* Configure backend address to API_BASE in file  ```ui/src/app/app.component.ts ```

### Start UI
* Start backend: ```cd ui; ./start.sh```
