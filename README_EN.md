# Xiaomi Fan Card (小米风扇卡片)

> Forked from [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi)

[中文](README.md) | **English**

An enhanced maintenance fork of [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi) v2.2.4, fixing compatibility with recent Home Assistant + Xiaomi Miot (xiaomi_miot) / Xiaomi Home (ha_xiaomi_home) integrations and adding bilingual (Chinese/English) UI support.

> The upstream repository has been unmaintained since July 2023. This project continues its evolution — thanks to the original authors.

## Preview

![Preview](preview.gif)

## Improvements over upstream

| # | Improvement | Notes |
|---|---|---|
| 1 | **Chinese preset support** | Recognizes `自然风` / `直吹风` presets (including the trailing-space quirk of Miot entity names) as equivalents of `nature` / `normal`; mode switching writes back the entity's exact original string |
| 2 | **Enhanced swing-angle entity discovery** | Auto-matches `select.*_horizontal_swing_included_angle*` (Miot `_p_X_Y` suffixes included) and `number.*_oscillation_angle`; also supports writing via the `select` domain (`select_option`) |
| 3 | **Full swing-angle levels** | Reads the complete level list from the select's `options` (e.g. 30/60/90/120/140°) instead of relying on number min/max/step |
| 4 | **Stepless speed slider** | The speed line in the middle of the card is a slider: a gray bar (non-draggable) when the fan is off, a green gradient slider when on. Drag to preview live, release to send `fan.set_percentage`; the step follows the entity's `percentage_step` (1% = truly stepless) |
| 5 | **Child lock toggle** | Auto-discovers `switch.*_physical_control*` (compatible with both Miot's `physical_controls_locked_p_X_Y` and Xiaomi Home's `physical_control_locked` spellings); one click toggles the real child lock |
| 6 | **Timer support** | Auto-discovers `number/select.*_delay_off_countdown*` / `countdown_time` / `off_delay_time`; click to cycle and display the remaining time |
| 7 | **Custom step buttons** | Bind two `button.*` entities via YAML or the editor; the side arrows step the fan direction on press. Falls back to native `fan.set_direction` when unbound, and hides the arrows entirely when unsupported |
| 8 | **Running-state indicator** | The ring around the power icon turns green while the fan runs; active buttons are highlighted green |
| 9 | **Bilingual UI** | Follows the Home Assistant interface language (Chinese/English) for all labels — child lock, angle, timer, speed, oscillate, natural/direct mode — including the configuration UI |
| 10 | **Enhanced visual editor** | Every auxiliary entity is a native HA entity picker; after picking the fan, matching entities are **auto-detected and pre-filled** (angle/timer/child lock/step buttons). Anything unmatched can be picked manually |
| 11 | **Performance** | Session-level caching of the entity registry and per-device match results; multiple cards share a single registry fetch |
| 12 | **Arrows only when supported** | When `fan.set_direction` is unsupported and no step buttons are bound, the arrows are not rendered (no more "fan.set_direction is not supported" errors) |

## Installation

### HACS (custom repository)
1. HACS → top-right menu → Custom repositories
2. Add this repository URL, category `Lovelace`
3. After install the resource is `/local/community/lovelace-fan-xiaomi/xiaomi-fan-card.js`

### Manual
Copy `dist/xiaomi-fan-card.js` to `<config>/www/community/lovelace-fan-xiaomi/`, then add the resource in Settings → Dashboards → Resources:
`/local/community/lovelace-fan-xiaomi/xiaomi-fan-card.js` (type: JavaScript module)

## Configuration

| Option | Required | Description |
|---|---|---|
| `entity` | ✓ | The fan entity |
| `platform` | | `default` (standard fan entities of Miot/Xiaomi Home) or `xiaomi_miio_fan` (legacy miio integration); defaults to `default` |
| `name` | | Display name |
| `angle_entity` | | Swing-angle entity (select/number); auto-discovered by name when omitted |
| `timer_entity` | | Timer entity (number/select); auto-discovered when omitted |
| `child_lock_entity` | | Child-lock entity (switch); auto-discovered when omitted |
| `turn_left_entity` | | Left step button (button); the left arrow presses it when bound |
| `turn_right_entity` | | Right step button (button) |
| `model` | | Override model detection (e.g. `dmaker.fan.p5`); usually unnecessary |
| `disable_animation` / `force_sleep_mode_support` / `hide_led_button` | | Same as upstream |

> Every field except `entity` can be set in the visual editor; entities auto-matched from the selected fan are pre-filled into the pickers.

### Example (Miot-integrated Smartmi standing fan)

```yaml
type: custom:fan-xiaomi
entity: fan.dmaker_fan_p5
name: Living Room Fan
angle_entity: select.dmaker_fan_p5_horizontal_swing_included_angle
timer_entity: number.dmaker_fan_p5_delay_off_countdown
child_lock_entity: switch.dmaker_fan_p5_physical_controls_locked
turn_left_entity: button.dmaker_fan_p5_turn_left
turn_right_entity: button.dmaker_fan_p5_turn_right
```

## Verified models

- Xiaomi Smart Standing Fan 1X (dmaker.fan.p5c, Xiaomi Miot integration)
- Xiaomi Smart Standing Fan (dmaker.fan.p5 series, Xiaomi Miot integration)

Other dmaker/zhimi fans should work in theory (capabilities are auto-detected from entity attributes) — feedback welcome.

## License

MIT (inherited from the original project)

## Credits

- **[finemeemb](https://github.com/fineemb/lovelace-fan-xiaomi)** — Original author
- [ikaruswill](https://github.com/ikaruswill/lovelace-fan-xiaomi) — Upstream maintainer
- [shaonianzhentan](https://github.com/shaonianzhentan)
- 花神

**Forked from [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi)** — an enhanced maintenance fork after upstream went unmaintained.
