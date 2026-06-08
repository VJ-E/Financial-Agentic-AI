import contextvars

gemini_api_keys_var = contextvars.ContextVar("gemini_api_keys", default=None)
