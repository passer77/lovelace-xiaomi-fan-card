# 小米风扇卡片 (Xiaomi Fan Card)

> Forked from [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi)

**中文** | [English](README_EN.md)

基于 [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi) v2.2.4 的增强维护版，修复其在新版 Home Assistant + 米家 (xiaomi_miot) / 小米官方 (ha_xiaomi_home) 集成下的兼容问题，并为中文环境优化。

> 原仓库自 2023-07 起停止维护。本项目在其基础上继续演进，感谢原作者。

## 预览 / Preview

![预览](preview.gif)

## 相比原版的改进

| # | 改进 | 说明 |
|---|---|---|
| 1 | **中文预设支持** | `自然风` / `直吹风`（含米家实体名尾随空格的怪癖）与 `nature`/`normal` 等价识别，模式切换精确回写实体原始字符串 |
| 2 | **摆风角度实体发现增强** | 自动匹配 `select.*_horizontal_swing_included_angle*`（米家带 `_p_X_Y` 后缀也能发现）、`number.*_oscillation_angle`，也支持 `select` 域写入（`select_option`） |
| 3 | **摆风档位补全** | 从 select 的 `options` 读取完整档位表（如 30/60/90/120/140°），不再依赖 number 的 min/max/step |
| 4 | **无级变速滑条** | 卡片中部的速度线即滑条：关机为灰条（不可拖），开机为绿色渐变条，拖动实时预览、松手下发 `fan.set_percentage`，步进自动跟随实体 `percentage_step`（1% 即真·无级） |
| 5 | **童锁开关** | 自动发现 `switch.*_physical_control*`（米家 `physical_controls_locked_p_X_Y` 与官方 `physical_control_locked` 拼写均兼容），点击即切换真实童锁 |
| 6 | **定时功能** | 自动发现 `number/select.*_delay_off_countdown*` / `countdown_time` / `off_delay_time`，点击循环切换并显示剩余时间 |
| 7 | **左右步进自定义按键** | YAML 或编辑器绑定两个 `button.*` 实体，风扇两侧箭头按下即步进；未绑定时回落原生 `fan.set_direction`，实体不支持则自动隐藏箭头 |
| 8 | **运行状态指示** | 风扇运行时电源图标外圈变绿，其它按钮绿色高亮，一眼可辨开关状态 |
| 9 | **双语界面** | 跟随 Home Assistant 界面语言自动切换中文/英文（童锁、夹角、定时、速度、摆头、自然风、直吹风），配置界面同步双语 |
| 10 | **可视化编辑器增强** | 全部辅助实体均为 HA 原生选择框；选中风扇后按设备**自动匹配并预填**（角度/定时/童锁/左右步进），未匹配到的可手动选择 |
| 11 | **性能优化** | 实体注册表会话级缓存 + 设备实体匹配缓存，多卡片共享一次拉取，渲染不再重复请求 |
| 12 | **转向箭头按需显示** | 实体不支持 `set_direction` 且未绑定步进按键时，箭头不再渲染（消除 "不支持动作 fan.set_direction" 报错） |

## 安装

### HACS（自定义仓库）
1. HACS → 右上角 → 自定义存储库
2. 填入本仓库地址，类别选 `Lovelace`
3. 安装后资源为 `/local/community/lovelace-fan-xiaomi/xiaomi-fan-card.js`

### 手动
复制 `dist/xiaomi-fan-card.js` 到 `<config>/www/community/lovelace-fan-xiaomi/`，然后在 设置 → 仪表盘 → 资源 添加：
`/local/community/lovelace-fan-xiaomi/xiaomi-fan-card.js`（类型 JavaScript 模块）

## 配置

| 字段 | 必填 | 说明 |
|---|---|---|
| `entity` | ✓ | fan 实体 |
| `platform` | | `default`（米家/官方集成的标准 fan 实体）或 `xiaomi_miio_fan`（旧 miio 集成），默认 `default` |
| `name` | | 显示名称 |
| `angle_entity` | | 摆风角度实体（select/number），不填按命名自动发现 |
| `timer_entity` | | 定时实体（number/select），不填自动发现 |
| `child_lock_entity` | | 童锁实体（switch），不填自动发现 |
| `turn_left_entity` | | 左步进按键实体（button），绑定后左箭头按下即触发 |
| `turn_right_entity` | | 右步进按键实体（button） |
| `model` | | 覆盖型号检测（如 `dmaker.fan.p5`），一般不需要 |
| `disable_animation` / `force_sleep_mode_support` / `hide_led_button` | | 同原版 |

> 除 `entity` 外全部字段均可通过可视化编辑器选择；选中风扇后自动匹配的实体会直接预填进选择框。

### 示例（米家集成的米家智能直流变频落地扇）

```yaml
type: custom:fan-xiaomi
entity: fan.dmaker_fan_p5
name: 客厅风扇
angle_entity: select.dmaker_fan_p5_horizontal_swing_included_angle
timer_entity: number.dmaker_fan_p5_delay_off_countdown
child_lock_entity: switch.dmaker_fan_p5_physical_controls_locked
turn_left_entity: button.dmaker_fan_p5_turn_left
turn_right_entity: button.dmaker_fan_p5_turn_right
```

## 已验证机型

- 米家智能直流变频落地扇 1X（dmaker.fan.p5c，米家集成）
- 米家直流变频落地扇（dmaker.fan.p5 系列，米家集成）

其它 dmaker/zhimi 风扇理论上兼容（能力按实体属性自动发现），欢迎反馈。

## 许可

MIT（继承原项目）

## 致谢 / Credits

- **[finemeemb](https://github.com/fineemb/lovelace-fan-xiaomi)** — Original author / 原作者
- [ikaruswill](https://github.com/ikaruswill/lovelace-fan-xiaomi) — 上游维护者 / upstream maintainer
- [shaonianzhentan](https://github.com/shaonianzhentan)
- 花神

**Forked from [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi)** — 上游停更后的增强维护版。
