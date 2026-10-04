/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Google Apps Script Web App
 * File: Code.gs
 * Description: Handles form submissions (Ideas, Collab) safely without exposing
 *              private write credentials in the client frontend.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (create a new spreadsheet named "Community Animation Hub Master").
 * 2. Create the following 6 tabs and ensure the exact headers in Row 1:
 *    - Tab 'Ideas':      [idea_id, title, description, author, category, submitted_at, status]
 *    - Tab 'Challenges': [challenge_id, type, title, prompt, start_date, end_date]
 *    - Tab 'Collab':     [post_id, project_slug, role_needed, description, contact, is_open]
 *    - Tab 'Assets':     [asset_id, name, file_ext, category, gdrive_url, author, preview_url]
 *    - Tab 'Tutorials':  [id, title, type, url, tags]
 *    - Tab 'Gallery':    [id, project_slug, title, video_url, thumbnail, released_at, credits]
 * 
 * 3. Go to Extensions > Apps Script, paste this Code.gs content, and click Save.
 * 4. Click Deploy > New deployment:
 *    - Select type: "Web app"
 *    - Description: "Community Hub API v1"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (crucial for client-side fetch)
 * 5. Click Deploy, Authorize access, and copy the Web App URL into `src/js/config.js`.
 * 6. File > Share > Publish to web: Publish entire document (or CSV per tab) to allow
 *    fast, free client-side reads!
 * ==============================================================================
 */

/**
 * Handle HTTP POST requests (Form submissions)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 10 seconds for concurrent requests
  var success = lock.tryLock(10000);
  
  if (!success) {
    return createJsonResponse({
      status: 'error',
      message: 'Server sedang sibuk, silakan coba beberapa detik lagi.'
    }, 429);
  }
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: 'error',
        message: 'Payload kosong atau format request tidak valid.'
      }, 400);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    // 1. Anti-spam honeypot detection
    // If the hidden '_hp' field is filled, silently reject (it's a bot)
    if (data._hp && data._hp.trim().length > 0) {
      return createJsonResponse({
        status: 'error',
        message: 'Spam detected.'
      }, 400);
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var targetSheetName = data.target_sheet || 'Ideas';
    var sheet = ss.getSheetByName(targetSheetName);
    
    if (!sheet) {
      return createJsonResponse({
        status: 'error',
        message: 'Sheet "' + targetSheetName + '" tidak ditemukan.'
      }, 404);
    }
    
    // 2. Route based on target sheet
    if (targetSheetName === 'Ideas') {
      // Validate required fields
      if (!data.title || !data.description) {
        return createJsonResponse({
          status: 'error',
          message: 'Judul dan deskripsi ide wajib diisi.'
        }, 400);
      }
      
      var timestamp = new Date();
      var dateStr = Utilities.formatDate(timestamp, 'GMT+7', 'yyyyMMdd-HHmmss');
      var randomSuffix = Math.floor(1000 + Math.random() * 9000);
      var ideaId = 'IDEA-' + dateStr + '-' + randomSuffix;
      
      sheet.appendRow([
        ideaId,
        sanitizeInput(data.title),
        sanitizeInput(data.description),
        sanitizeInput(data.author || 'Anonim'),
        sanitizeInput(data.category || 'General'),
        timestamp.toISOString(),
        'approved' // default status for MVP (admin can toggle in sheet)
      ]);
      
      return createJsonResponse({
        status: 'success',
        message: 'Ide berhasil dikirim ke Idea Bank!',
        data: {
          idea_id: ideaId,
          title: data.title
        }
      }, 200);
    }
    
    if (targetSheetName === 'Collab') {
      if (!data.role_needed || !data.contact) {
        return createJsonResponse({
          status: 'error',
          message: 'Role yang dibutuhkan dan kontak wajib diisi.'
        }, 400);
      }
      
      var postId = 'COL-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss');
      sheet.appendRow([
        postId,
        sanitizeInput(data.project_slug || 'general'),
        sanitizeInput(data.role_needed),
        sanitizeInput(data.description || ''),
        sanitizeInput(data.contact),
        'true' // is_open
      ]);
      
      return createJsonResponse({
        status: 'success',
        message: 'Lowongan kolaborasi berhasil diposting!',
        data: { post_id: postId }
      }, 200);
    }
    
    return createJsonResponse({
      status: 'error',
      message: 'Target sheet "' + targetSheetName + '" tidak didukung untuk penulisan langsung.'
    }, 400);
    
  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Internal error: ' + err.toString()
    }, 500);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handle HTTP GET requests (Health check and direct tab JSON readout)
 */
function doGet(e) {
  var params = e ? e.parameter : {};
  var tab = params.tab;
  
  if (!tab) {
    return createJsonResponse({
      status: 'ok',
      service: 'Community Animation Hub Apps Script API',
      timestamp: new Date().toISOString()
    }, 200);
  }
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tab);
    
    if (!sheet) {
      return createJsonResponse({ status: 'error', message: 'Tab not found' }, 404);
    }
    
    var values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      return createJsonResponse({ status: 'success', data: [] }, 200);
    }
    
    var headers = values[0].map(function(h) { return String(h).trim(); });
    var rows = [];
    
    for (var i = 1; i < values.length; i++) {
      var rowObj = {};
      for (var j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = values[i][j];
      }
      rows.push(rowObj);
    }
    
    return createJsonResponse({ status: 'success', data: rows }, 200);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

/**
 * Helper to build JSON output with CORS compatibility
 */
function createJsonResponse(obj, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Basic string sanitization
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.trim()
    .replace(/[<>]/g, ''); // strip basic HTML tags
}
