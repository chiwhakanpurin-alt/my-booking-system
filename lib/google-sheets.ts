/**
 * Google Sheets Integration Helper (Optional)
 * 
 * To enable, set GOOGLE_SHEETS_WEBHOOK_URL in .env.local.
 * 
 * Sample Google Apps Script code to deploy:
 * 
 * ```javascript
 * function doPost(e) {
 *   const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
 *   const payload = JSON.parse(e.postData.contents);
 *   const { action, booking } = payload;
 *   
 *   if (action === 'insert') {
 *     // Append new row
 *     sheet.appendRow([
 *       booking.id,
 *       booking.activity_name,
 *       booking.booked_by,
 *       booking.room_name,
 *       booking.booking_date,
 *       booking.start_time,
 *       booking.end_time,
 *       booking.status,
 *       new Date(booking.created_at).toLocaleString('th-TH')
 *     ]);
 *     return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Inserted' }))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   if (action === 'update') {
 *     // Update status of matching ID row
 *     const data = sheet.getDataRange().getValues();
 *     let found = false;
 *     for (let i = 1; i < data.length; i++) {
 *       if (data[i][0] === booking.id) {
 *         sheet.getRange(i + 1, 8).setValue(booking.status); // Status is column H (index 8)
 *         found = true;
 *         break;
 *       }
 *     }
 *     return ContentService.createTextOutput(JSON.stringify({ status: found ? 'success' : 'not_found', message: found ? 'Updated' : 'Row not found' }))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 *   
 *   return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
 *     .setMimeType(ContentService.MimeType.JSON);
 * }
 * ```
 */

const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

interface BookingPayload {
  id: string;
  activity_name: string;
  booked_by: string;
  room_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

export async function syncToGoogleSheets(action: 'insert' | 'update', booking: BookingPayload) {
  if (!webhookUrl) {
    console.log('Google Sheets Sync: GOOGLE_SHEETS_WEBHOOK_URL is not set. Skipping integration.');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, booking }),
      // Set a timeout of 5 seconds to prevent blocking requests
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Google Sheets Sync Success:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Google Sheets Sync Failed:', error);
    return { success: false, error: String(error) };
  }
}
