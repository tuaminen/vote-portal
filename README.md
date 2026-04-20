# Instructions

## Configuration

### Make sure UI uses backend at localhost

* Open ```ui/src/app/vote.service.ts```, and make sure that API_BASE is set to localhost like this:
  ```export const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:8080';```

### Configure event title (i.e. the date)
* modify ```TOPIC_TITLE``` at ```backend/docker-compose.yml``` 

### Configure voting items
* Modify voting items at ```data/upload_items.sh```
* Generate PNG images for new items using AI or such
* Generate JPGs from PNG by running ```cd data; ./create_jpgs.sh```
* Commit new items to git

### OPTIONAL: Testing: Run backend
* Run ```cd backend; ./start.sh```

### OPTIONAL: Testing: Install data
* Once backend is up, upload items to database using ```cd data; upload_items.sh```

### OPTIONAL: Testing: Start UI
* Run ```cd ui; ./start.sh```

### Deploy to cloud
* Note: you need Google cloud access to project=macro-crane-801 and vote-portal VM
* Run ```./deploy.sh```

### Testing
* Test by opening browser to http://${VOTE_IP}:8081/
