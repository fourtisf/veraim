# veraim (Python)

Tiny client for the [Veraim](https://veraim.xyz) API, no dependencies.

```bash
pip install veraim
```

```python
import os
from veraim import Veraim

veraim = Veraim(api_key=os.environ["VERAIM_KEY"])  # key from veraim.xyz/account
res = veraim.agents.run("bundle-hound", input="Is 0x7a3...e91f bundled?")
print(res.verdict, res.seal)  # BUNDLED 0x9c2…
```

Verify a webhook:

```python
from veraim import verify_webhook
ok = verify_webhook(os.environ["VERAIM_WEBHOOK_SECRET"], request_body, headers["X-Veraim-Signature"])
```

Publish: `pip install build twine && python -m build && twine upload dist/*` (the name `veraim` must be free on PyPI; rename in pyproject.toml otherwise).
