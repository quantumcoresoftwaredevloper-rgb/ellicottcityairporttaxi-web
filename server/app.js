// Passenger (cPanel / shared hosting) entry point.
//
// Passenger requires a literal `app.js` in the application root and expects the
// app to listen on $PORT, which `src/index.js` already does. Importing it is
// therefore all that is needed — do NOT start a second server here.
//
// This file is inert for every other run path: `npm start` and `npm run dev`
// still execute `src/index.js` directly, and the Render blueprint does too.
import './src/index.js';
