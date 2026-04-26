import { paint, c } from '../ui/colors.js';

// Ask the AI to produce a JSON plan, then execute each step
export async function runPlanner(goal, sendMessage, executeActions, undoStack, cwd) {
  console.log(`\n${paint.info('Planning:')} ${goal}\n`);

  const planPrompt = `Create a step-by-step JSON plan to accomplish this goal: "${goal}"

Respond with ONLY a JSON array, no markdown fences, no explanation:
[
  { "step": 1, "description": "...", "action": "write|cmd|explain", "detail": "..." },
  ...
]

Keep steps small and focused. Use action "explain" for analysis steps that need no file/command output.`;

  let planJson = '';
  try {
    planJson = await sendMessage(planPrompt, { raw: true });
  } catch (e) {
    console.log(paint.error(`Plan generation failed: ${e.message}`));
    return;
  }

  let steps;
  try {
    // Strip any accidental markdown
    const cleaned = planJson.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
    steps = JSON.parse(cleaned);
  } catch {
    console.log(paint.error('Could not parse plan JSON. Raw response:'));
    console.log(paint.dim(planJson.slice(0, 500)));
    return;
  }

  console.log(`\n${paint.bold('Generated Plan:')}\n`);
  steps.forEach((s, i) => {
    const icon = s.action === 'write' ? paint.file('✎') : s.action === 'cmd' ? paint.warn('⚡') : paint.dim('◉');
    console.log(`  ${icon} ${paint.bold('Step ' + (i + 1) + ':')} ${s.description}`);
  });
  console.log();

  for (const step of steps) {
    console.log(`\n${paint.bold(c.cyan + '▶ Step ' + step.step + ':' + c.reset)} ${step.description}`);

    if (step.action === 'explain') {
      // Just ask AI to explain/analyze
      const response = await sendMessage(`Step ${step.step}: ${step.description}\n\nDetail: ${step.detail || ''}`);
      process.stdout.write(response + '\n');
      continue;
    }

    // Ask AI to actually implement the step
    const stepPrompt = `Execute step ${step.step} of our plan: ${step.description}
Detail: ${step.detail || ''}
Goal context: ${goal}
Use WRITE_FILE: or RUN_CMD: blocks as needed.`;

    const response = await sendMessage(stepPrompt);
    const { parseActions } = await import('./executor.js');
    const actions = parseActions(response);
    await executeActions(actions, cwd, undoStack);
  }

  console.log(`\n${paint.success('✓ Plan complete!')}\n`);
}
