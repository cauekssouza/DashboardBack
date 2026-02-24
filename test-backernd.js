const { google } = require('googleapis');
require('dotenv').config();

async function test() {
  console.log('🔍 Testando conexão com Google Sheets...');
  
  try {
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const sheetId = process.env.GOOGLE_SHEETS_SHEET_ID;

    console.log('📧 Client Email:', clientEmail);
    console.log('📄 Sheet ID:', sheetId);
    console.log('🔑 Private Key existe?', !!privateKey);

    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        private_key: privateKey.replace(/\\n/g, '\n'),
        client_email: clientEmail,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Página1!A:Z',
    });

    console.log('✅ Conexão bem sucedida!');
    console.log('📊 Linhas encontradas:', response.data.values?.length || 0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

test();