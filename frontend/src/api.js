const BASE = '';

export async function uploadCodebase(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${BASE}/api/codebase/upload`, {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `Upload failed (${res.status})`);
  return text;
}

export async function askQuestion(question) {
  const res = await fetch(`${BASE}/api/codebase/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `Chat request failed (${res.status})`);
  return text;
}
