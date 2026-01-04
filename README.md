# Pushup Pulseboard

Modern pushup race dashboard backed by Google Sheets.

## Setup

1. Create `.env` from `.env.example` and set `SHEET_ID` and `SHEET_NAME`.
2. Install dependencies and start the server:

```bash
npm install
npm start
```

Open `http://localhost:3456`.

## Sheet format

Recommended (normalized):

```
Date | Name | Pushups | Pullups
```

Only `Date`, `Name`, and `Pushups` are required. Extra columns like `Pullups` are ignored.

Alternative (wide):

```
Date | Alex | Priya | Sam
```

Each following row should include a date in the first column and daily totals for each person.
