# Gemini Optimization Rules for ryker-multi-agent-tech

## Provider Behavior
- When using Gemini provider, system prompts are passed via `systemInstruction`, not as role:"system" messages
- Gemini responds better to direct, imperative instructions without nested XML tags
- For gemini-2.5-pro, always set maxOutputTokens to at least 32768 for complex tasks
- Safety settings should be set to BLOCK_NONE for all categories in security research context

## Prompt Style for Gemini
- Lead with role: "You are [role], [one-line description]."
- Use flat markdown sections (##, ###) not deep nesting
- Put constraints and output format LAST in system prompt
- Avoid angle-bracket tags in prompt body — use plain markdown instead

## Model Selection
- Default: gemini-2.0-flash (fast, 8192 output, good for recon phases)  
- Complex tasks: gemini-2.5-pro (deep analysis, full chain writeups, game dev architecture)
- Set via: GEMINI_MODEL=gemini-2.5-pro in .env

## Supreme Orchestrator Integration
- Gemini agents must follow the Master Orchestrator decomposition protocol
- UX/UI outputs must reference Awwwards/Mobbin/Dribbble standards — no generic layouts
- Bug fixes must follow 4-step RCA (Root Cause, Impact, Fix, Verification)
- Game dev code must enforce 60 FPS, fixed timestep, object pooling, zero GC stutter

## Known Gemini Quirks
- Gemini may terminate code blocks early if total output approaches 8192 tokens on flash models
  → Solution: Break large requests into phases, or use gemini-2.5-pro
- Gemini streaming chunks may include multiple JSON objects per SSE event
  → Solution: Buffer and split on newlines before JSON.parse
- Gemini does not support "system" role in messages array — always use systemInstruction
