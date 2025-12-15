## 2024-05-24 - AI Prompt Injection Mitigation
**Vulnerability:** Input fields fed directly into AI prompts can be manipulated to override system instructions (Prompt Injection).
**Learning:** Even internal-looking inputs (like `drinkName` from a database) can be spoofed in Server Actions.
**Prevention:** Whitelist inputs against a known valid set (like a database or enum) before passing them to the LLM. Do not rely on client-side validation alone.
