## Highlights

- Native Web Component
- SVG rendering + vanilla JavaScript
- Zero runtime dependencies
- Automatic blinking and subtle idle behavior
- Pointer-following eyes and inertial head movement
- Jelly-style drag deformation with elastic recovery
- Programmatically controlled Agent states and expressions
- Waiting, success, failure, warning, review, blocked, and system-error feedback
- Reduced-motion support
- Configurable sleep behavior
- Adjustable head roundness
- Optional antenna status flashing
- TypeScript declarations included

## Install

```bash
npm install agent-robot-avatar
```

```js
import 'agent-robot-avatar';
```

Or load the repository source directly:

```html
<script type="module" src="./agent-robot-avatar.js"></script>
```

Then add the component:

```html
<agent-robot-avatar id="avatar"></agent-robot-avatar>
```

No initialization code is required. The avatar enters its default idle behavior automatically.

## Basic usage

```js
const avatar = document.querySelector('#avatar');

avatar.play('success');
avatar.play('warning');
avatar.play('error');

avatar.reset();
```

Available actions:

`idle` · `bored` · `waiting` · `input` · `send` · `success` · `failure` · `warning` · `inspect` · `blocked` · `error` · `surprise` · `sleep` · `wake`

`failure` is intended for a task that completed unsuccessfully, while `error` is intended for connection, service, or system failures.

For a real Agent request lifecycle:

```js
avatar.startWaiting();

try {
  const result = await runAgentRequest();
  await avatar.play(result.ok ? 'success' : 'failure');
} catch (error) {
  await avatar.play('error');
}
```

## Common options

```html
<agent-robot-avatar
  size="160"
  color="#08090b"
  auto-sleep="30000"
  wake-on="activity"
  motion="auto">
</agent-robot-avatar>
```

| Attribute | Purpose |
| --- | --- |
| `size` | Avatar size in pixels |
| `color` | Main avatar color |
| `auto-sleep` | Idle time before automatic sleep; `0` disables it |
| `wake-on` | Automatic wake policy: `activity`, `interaction`, or `manual` |
| `motion` | Motion policy: `auto`, `reduce`, or `full` |

Common runtime controls:

```js
avatar.setPointerFollow(false);
avatar.setHeadRoundness(75);
avatar.setAntennaFlash(true);
```

## Events and integration

The component emits `face-state` for visual state changes and `action-state` for semantic action lifecycle changes.

For host integrations and accessibility status text, prefer `action-state`. See [`examples/accessibility.html`](./examples/accessibility.html) for a runnable request-lifecycle example.

A minimal integration example is available at [`examples/basic.html`](./examples/basic.html).

## Compatibility

Designed for modern browsers with support for ES Modules, Custom Elements, SVG, Pointer Events, Web Animations API, `IntersectionObserver`, `ResizeObserver`, and `matchMedia`.

Automated browser tests cover Chromium, Firefox, and WebKit.