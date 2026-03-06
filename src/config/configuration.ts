export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:caueks@localhost:5432/historico_db',
  },
  google: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL ?? '',
    privateKey: process.env.GOOGLE_PRIVATE_KEY ?? '',
    spreadsheetId: process.env.SPREADSHEET_ID ?? '',
  },
  syncInterval: process.env.SYNC_INTERVAL ?? '*/5 * * * *',
});