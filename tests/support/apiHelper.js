async function getBusinessDate(apiContext) {
  const res = await apiContext.get('/api/system/date');
  const body = await res.json();
  return body.business_date;
}

async function advanceDate(apiContext) {
  const res = await apiContext.post('/api/system/advance-date');
  return res.json();
}

async function uploadBondFile(apiContext, csvContent, fileName) {
  // Bonds are created via SFTP file drop in this environment.
  // In CI/local, the test suite writes directly to the mounted sftp/upload/bonds folder.
  const fs = require('fs');
  const path = require('path');
  const uploadDir = path.join(__dirname, '..', '..', 'sftp', 'upload', 'bonds');
  fs.writeFileSync(path.join(uploadDir, fileName), csvContent);
  // small delay to allow backend to pick up the file
  await new Promise(r => setTimeout(r, 2000));
}

async function subscribe(apiContext, bondId, userId, quantity) {
  return apiContext.post(`/api/v1/bonds/${bondId}/subscribe`, {
    headers: { 'X-User-Id': userId },
    data: { quantity }
  });
}

async function getBonds(apiContext) {
  const res = await apiContext.get('/api/v1/bonds');
  return res.json();
}

async function getBond(apiContext, bondId) {
  const res = await apiContext.get(`/api/v1/bonds/${bondId}`);
  return res.json();
}

async function getPortfolio(apiContext, userId) {
  const res = await apiContext.get('/api/v1/portfolio', {
    headers: { 'X-User-Id': userId }
  });
  return res.json();
}

module.exports = { getBusinessDate, advanceDate, uploadBondFile, subscribe, getBonds, getBond, getPortfolio };
