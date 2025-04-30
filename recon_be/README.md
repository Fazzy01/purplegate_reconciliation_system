## Configuration
- - cd recon_be
- RUN npm install
- cd into config\app.js if want to change the server url
server: {
    url: 'http://localhost:3400',
    port: 3400,
  },


## Run Server
- npm run start-dev

## Generate large two csv with the large_csv.py on the root folder
- run python large_csv.py

## Test Endpoint
- you can test endpoint by sending the fils from frontend or direct through postman

** POSTMAN
- endpoint:  http://localhost:3400/api/reconcile/direct
formdata
    key         value
    file1       load csv from machine
    file2       load csv from machine

## Check results manually
cd into /src/reports/    you will find the report