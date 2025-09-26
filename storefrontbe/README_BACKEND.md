Setup (backend)

1) Create .env from .env.example with:
   - ONTRAPORT_APP_ID
   - ONTRAPORT_API_KEY
   - PORT (optional, default 3001)

2) Install and run:
   - npm install
   - npm run dev

Endpoints

- POST /api/contacts/saveorupdate
  Body JSON:
  {
    "firstname": "",
    "lastname": "",
    "email": "required",
    "sms_number": ""
  }
  Notes:
  - Uses update_by=email to create-or-update contact at Ontraport.


