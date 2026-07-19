const fs = require('fs');
const path = require('path');

async function getBusinessDate(apiContext) {
  const res = await apiContext.get('/api/system/date');
  const body = await res.json();
  return body.business_date;
}

async function advanceDate(apiContext) {
  const res = await apiContext.post('/api/system/advance-date');
  return res.json();
}

async function uploadBondFile(apiContext, csvContent, fileName, isin, maxRetries = 15) {
  const uploadDir = path.join(__dirname, '..', '..', 'sftp', 'upload', 'bonds');
  fs.writeFileSync(path.join(uploadDir, fileName), csvContent);

  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const bonds = await getBonds(apiContext);
    const found = bonds.find(b => b.isin === isin);
    if (found) return found;
  }
  return null;
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
