import readline from 'readline';
import { config } from './config.js';
import { c, paint, hr } from '../ui/colors.js';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (Claude)', models: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'] },
  { id: 'openai', name: 'OpenAI (GPT)', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'openrouter', name: 'OpenRouter', models: ['openai/gpt-4o', 'anthropic/claude-opus-4', 'meta-llama/llama-3.3-70b-instruct'] },
  { id: 'ollama', name: 'Ollama (local)', models: ['llama3.2', 'mistral', 'codellama', 'phi4'] },
  { id: 'groq', name: 'Groq', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'] },
  { id: 'mistral', name: 'Mistral AI', models: ['mistral-large-latest', 'mistral-medium-latest'] },
  { id: 'cohere', name: 'Cohere', models: ['command-r-plus', 'command-r'] },
];

function arrowMenu(items, title) {
  return new Promise((resolve) => {
    let selected = 0;
    const render = () => {
      process.stdout.write('\x1b[2J\x1b[H');
      console.log(`\n  ${paint.bold(title)}\n`);
      items.forEach((item, i) => {
        if (i === selected) {
          console.log(`  ${c.cyan}❯${c.reset} ${paint.bold(typeof item === 'string' ? item : item.name)}`);
        } else {
          console.log(`    ${paint.dim(typeof item === 'string' ? item : item.name)}`);
        }
      });
      console.log(`\n  ${paint.dim('↑/↓ navigate  •  Enter select')}`);
    };

    render();
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      if (key === '[A' || key === '[A') { // up
        selected = (selected - 1 + items.length) % items.length;
        render();
      } else if (key === '[B' || key === '[B') { // down
        selected = (selected + 1) % items.length;
        render();
      } else if (key === '\r' || key === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\x1b[2J\x1b[H');
        resolve(items[selected]);
      } else if (key === '') { // Ctrl+C
        process.stdin.setRawMode(false);
        process.exit(0);
      }
    };

    process.stdin.on('data', onData);
  });
}

function prompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function runSetupWizard() {
  process.stdout.write('\x1b[2J\x1b[H');
  console.log(`\n  ${paint.bold(c.cyan + 'Welcome to Nina CLI Setup!' + c.reset)}`);
  console.log(`  ${paint.dim("Let's configure your AI provider.\n")}`);

  // Select provider
  const provider = await arrowMenu(PROVIDERS, 'Choose your AI provider:');

  // Enter API key (skip for Ollama)
  let apiKey = '';
  if (provider.id !== 'ollama') {
    process.stdout.write('\x1b[2J\x1b[H');
    console.log(`\n  ${paint.bold('Configure ' + provider.name)}\n`);
    console.log(`  ${paint.dim('Your key is stored encrypted in ~/.nina/credentials.json')}`);
    console.log(`  ${paint.dim('Or set env var: ' + provider.id.toUpperCase() + '_API_KEY to skip\n')}`);
    apiKey = await prompt(`  ${paint.info('API Key')} ${paint.dim('(leave empty to use env var)')}${c.cyan}: ${c.reset}`);
    if (apiKey) {
      config.setKey(provider.id, apiKey);
      console.log(`  ${paint.success('✓ API key saved')}\n`);
    }
  }

  // Select model
  const model = await arrowMenu(
    [...provider.models, '[ Enter custom model name ]'],
    `Choose model for ${provider.name}:`
  );

  let finalModel = model;
  if (model === '[ Enter custom model name ]') {
    finalModel = await prompt(`  ${paint.info('Model name')}: `);
  }

  // Save config
  config.set('provider', provider.id);
  config.set('model', finalModel);
  config.set('setupComplete', true);

  process.stdout.write('\x1b[2J\x1b[H');
  console.log(`\n  ${paint.success('✓ Setup complete!')}\n`);
  console.log(`  ${paint.dim('Provider:')} ${paint.provider(provider.name)}`);
  console.log(`  ${paint.dim('Model:')}    ${paint.info(finalModel)}`);
  console.log(`\n  ${paint.dim('You can change these anytime with')} ${paint.info('/use <provider> [model]')}\n`);

  return { provider: provider.id, model: finalModel };
}
