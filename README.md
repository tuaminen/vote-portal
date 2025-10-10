
# Instructions


## Configuration

### Configure voting items
* Modify voting items at ```data/upload_items.sh```
* Generate PNG images for new items using AI or such
* Generate JPGs from PNG by running ```mogrify -format jpg -quality 85 -resize 75%   *.png```
* Once backend is up, upload items to database using ```upload_items.sh```

### Configure event title (i.e. the date)
* modify ```TOPIC_TITLE``` at ```backend/docker-compose.yml``` 

### Configure UI
* Configure backend address to API_BASE in file  ```ui/src/app/app.component.ts ```
