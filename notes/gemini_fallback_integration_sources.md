# Gemini Fallback Integration Sources

The Gemini fallback uses the server-side `POST https://generativelanguage.googleapis.com/v1beta/interactions` endpoint with `x-goog-api-key` authentication, `store: false`, and a structured `response_format` containing `type: "text"`, `mime_type: "application/json"`, and a JSON schema. The response’s final model text is extracted from the `model_output` entry in `steps[].content[]`; some responses do not populate the convenience `output_text` field. The application’s live credential smoke test verified this request and response path with the project credential on 2026-08-19.

The fallback model is `gemini-3.6-flash`, because the provider reported that `gemini-2.5-flash` is unavailable for the configured account and directed use of `gemini-3.6-flash`.

Sources:

- [Gemini Interactions API reference](https://ai.google.dev/api/interactions-api)
- [Gemini structured outputs documentation](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini OpenAI compatibility documentation](https://ai.google.dev/gemini-api/docs/openai)
