# Backend Setup Instructions

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Ontraport API Configuration
ONTRAPORT_APP_ID=your_app_id_here
ONTRAPORT_API_KEY=your_api_key_here
ONTRAPORT_BASE_URL=https://api.ontraport.com/1

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Gateway Configuration
DUMMY_GATEWAY_ID=1
```

## Running the Server

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The server will be available at `http://localhost:3001`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/contact/save` - Save contact information
- `POST /api/coupons/validate` - Validate coupon codes
- `GET /api/shipping/types` - Get available shipping types
- `POST /api/offer/build` - Build pricing offer
- `POST /api/transaction/process` - Process payment transaction

## Testing

Run the offer engine tests:
```bash
node server/test.js
```

## Features Implemented

✅ Contact saving with shipping address
✅ Coupon validation pipeline (existence, validity, usage, product applicability)
✅ Dynamic shipping options (hidden when no shipping required)
✅ Server-side offer building with discount calculations
✅ Transaction processing with Ontraport
✅ Frontend integration with error handling
✅ Local storage persistence for form state
✅ Complete checkout flow with success page
