
## Git clone the project
git clone https://github.com/Fazzy01/purplegate_reconciliation_system


## SETUP BACKEND
- cd recon_be
- RUN npm

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




## SETUP FRONTEND
- cd pglt_fe
- RUN npm install
## Configuration
NODE_ENV = development
NEXT_PUBLIC_LOCAL_BASE_URL=http://localhost:3400 OR THE BACKEND SERVER
NEXT_PUBLIC_PRODUCTION_BASE_URL=http://localhost:3400 OR THE BACKEND SERVER
- Run npm run dev


## TEST ENDPOINT FROM FRONTEND OR DIRECT API
- you can test endpoint by sending the fils from frontend or direct through postman

** POSTMAN
- endpoint:  http://localhost:3400/api/reconcile/direct
formdata
    key         value
    file1       load csv from machine
    file2       load csv from machine

## Check results manually
cd into /src/reports/    you will find the report