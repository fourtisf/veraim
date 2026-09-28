# prova (Python)

Tiny client for the [Prova](https://prova.live) API, no dependencies.

```bash
pip install prova
```

```python
import os
from prova import Prova

prova = Prova(api_key=os.environ["PROVA_KEY"])  # key from prova.live/account
res = prova.agents.run("bundle-hound", input="Is 0x7a3...e91f bundled?")
print(res.verdict, res.seal)  # BUNDLED 0x9c2…
```

Verify a webhook:

```python
from prova import verify_webhook
ok = verify_webhook(os.environ["PROVA_WEBHOOK_SECRET"], request_body, headers["X-Prova-Signature"])
```

Publish: `pip install build twine && python -m build && twine upload dist/*` (the name `prova` must be free on PyPI; rename in pyproject.toml otherwise).
