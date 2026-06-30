export const PROVIDERS = {
  anthropic:  { label: 'Anthropic',  defaultModel: 'claude-sonnet-4-6', models: ['claude-opus-4-7','claude-sonnet-4-6','claude-haiku-4-5-20251001'] },
  openai:     { label: 'OpenAI',     defaultModel: 'gpt-4o',            models: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','o1','o3-mini'] },
  gemini:     { label: 'Gemini',     defaultModel: 'gemini-2.0-flash',   models: ['gemini-2.0-flash','gemini-1.5-pro','gemini-1.5-flash'] },
  openrouter: { label: 'OpenRouter', defaultModel: 'openai/gpt-4o',     models: ['openai/gpt-4o','anthropic/claude-opus-4','meta-llama/llama-3.3-70b-instruct'] },
  ollama:     { label: 'Ollama',     defaultModel: 'llama3.2',          models: ['llama3.2','mistral','codellama','phi4'] },
  groq:       { label: 'Groq',       defaultModel: 'llama-3.3-70b-versatile', models: ['llama-3.3-70b-versatile','mixtral-8x7b-32768'] },
  mistral:    { label: 'Mistral',    defaultModel: 'mistral-large-latest', models: ['mistral-large-latest','codestral-latest'] },
  cohere:     { label: 'Cohere',     defaultModel: 'command-r-plus',    models: ['command-r-plus','command-r'] },
};

const NINA_TOOLS = [
  { name: 'write_file', description: 'Write or overwrite a file', input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'run_cmd', description: 'Run a shell command', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  { name: 'delete_file', description: 'Delete a file', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
];

function toolCallToAction(name, input) {
  switch (name) {
    case 'write_file':  return `WRITE_FILE: ${input.path}\n\`\`\`\n${input.content}\n\`\`\``;
    case 'run_cmd':      return `RUN_CMD: ${input.command}`;
    case 'delete_file':  return `DELETE_FILE: ${input.path}`;
    default: return '';
  }
}

// onChunk(text) called for each streamed token; signal aborts the request
export async function callProvider(provider, model, messages, systemPrompt, apiKey, onChunk, signal) {
  switch (provider) {
    case 'anthropic':  return anthropic(model, messages, systemPrompt, apiKey, onChunk, signal);
    case 'openai':     return openaiCompat('https://api.openai.com', model, messages, systemPrompt, apiKey, onChunk, signal);
    case 'groq':       return openaiCompat('https://api.groq.com/openai', model, messages, systemPrompt, apiKey, onChunk, signal);
    case 'mistral':    return openaiCompat('https://api.mistral.ai', model, messages, systemPrompt, apiKey, onChunk, signal);
    case 'openrouter': return openaiCompat('https://openrouter.ai/api', model, messages, systemPrompt, apiKey, onChunk, signal);
    case 'gemini':     return gemini(model, messages, systemPrompt, apiKey, onChunk, signal);
    case 'ollama':     return ollama(model, messages, systemPrompt, onChunk, signal);
    case 'cohere':     return cohere(model, messages, systemPrompt, apiKey, signal);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

async function streamLines(res, onChunk, parse) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = '';
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const text = parse(line);
      if (text) { onChunk(text); full += text; }
    }
  }
  return full;
}

async function anthropic(model, messages, system, apiKey, onChunk, signal) {
  const body = { model, max_tokens: 4096, stream: !!onChunk, messages, tools: NINA_TOOLS };
  if (system) body.system = system;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  if (!onChunk) {
    const data = await res.json();
    const toolUses = (data.content ?? []).filter(b => b.type === 'tool_use');
    if (toolUses.length) {
      return toolUses.map(b => toolCallToAction(b.name, b.input)).join('\n');
    }
    return data.content?.[0]?.text ?? '';
  }
  return streamLines(res, onChunk, (line) => {
    if (!line.startsWith('data:')) return '';
    try { const d = JSON.parse(line.slice(5)); return d.delta?.text ?? ''; } catch { return ''; }
  });
}

const OPENAI_TOOLS = NINA_TOOLS.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));

async function openaiCompat(base, model, messages, system, apiKey, onChunk, signal) {
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST', signal,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: msgs, max_tokens: 4096, stream: !!onChunk, tools: OPENAI_TOOLS }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  if (!onChunk) {
    const data = await res.json();
    const toolCalls = data.choices?.[0]?.message?.tool_calls ?? [];
    if (toolCalls.length) {
      return toolCalls.map(tc => toolCallToAction(tc.function.name, JSON.parse(tc.function.arguments))).join('\n');
    }
    return data.choices?.[0]?.message?.content ?? '';
  }
  return streamLines(res, onChunk, (line) => {
    if (!line.startsWith('data:')) return '';
    const s = line.slice(5).trim();
    if (s === '[DONE]') return '';
    try { return JSON.parse(s).choices?.[0]?.delta?.content ?? ''; } catch { return ''; }
  });
}

const GEMINI_TOOLS = [{ functionDeclarations: NINA_TOOLS.map(t => ({ name: t.name, description: t.description, parameters: t.input_schema })) }];

async function gemini(model, messages, system, apiKey, onChunk, signal) {
  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const body = { contents, tools: GEMINI_TOOLS };
  if (system) body.system_instruction = { parts: [{ text: system }] };
  const endpoint = onChunk ? 'streamGenerateContent?alt=sse' : 'generateContent';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}&key=${apiKey}`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  if (!onChunk) {
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const fnCalls = parts.filter(p => p.functionCall);
    if (fnCalls.length) {
      return fnCalls.map(p => toolCallToAction(p.functionCall.name, p.functionCall.args)).join('\n');
    }
    return parts[0]?.text ?? '';
  }
  return streamLines(res, onChunk, (line) => {
    if (!line.startsWith('data:')) return '';
    try { return JSON.parse(line.slice(5)).candidates?.[0]?.content?.parts?.[0]?.text ?? ''; } catch { return ''; }
  });
}

async function ollama(model, messages, system, onChunk, signal) {
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: msgs, stream: !!onChunk }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  if (!onChunk) return (await res.json()).message?.content ?? '';
  return streamLines(res, onChunk, (line) => {
    try { const d = JSON.parse(line); return d.done ? '' : (d.message?.content ?? ''); } catch { return ''; }
  });
}

async function cohere(model, messages, system, apiKey, signal) {
  const body = { model, messages };
  if (system) body.system = system;
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST', signal,
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
  return (await res.json()).message?.content?.[0]?.text ?? '';
}
