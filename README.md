# 小米风扇卡片 (Xiaomi Fan Card)

> Forked from [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi)

基于 [ikaruswill/lovelace-fan-xiaomi](https://github.com/ikaruswill/lovelace-fan-xiaomi) v2.2.4 的增强维护版，修复其在新版 Home Assistant + 米家 (xiaomi_miot) / 小米官方 (ha_xiaomi_home) 集成下的兼容问题，并为中文环境优化。

> 原仓库自 2023-07 起停止维护。本项目在其基础上继续演进，感谢原作者。

## 相比原版的改进

| # | 改进 | 说明 |
|---|---|---|
| 1 | **中文预设支持** | `自然风` / `直吹风`（含米家实体名尾随空格的怪癖）与 `nature`/`normal` 等价识别，模式切换精确回写实体原始字符串 |
| 2 | **摆风角度实体发现增强** | 自动匹配 `select.*_horizontal_swing_included_angle*`（米家带 `_p_X_Y` 后缀也能发现）、`number.*_oscillation_angle`，也支持 `select` 域写入（`select_option`）|
| 3 | **摆风档位补全** | 从 select 的 `options` 读取完整档位表（如 30/60/90/120/140°），不再依赖 number 的 min/max/step |
| 4 | **左右步进自定义按键** | YAML 绑定两个 `button.*` 实体，风扇两侧箭头按下即步进（如 `向左转`/`向右转`）；未绑定时回落原生 `fan.set_direction`，实体不支持则自动隐藏箭头 |
| 5 | **转向箭头按需显示** | 实体不支持 `set_direction` 且未绑定步进按键时，箭头不再渲染（消除 "不支持动作 fan.set_direction" 报错）|
| 6 | **单文件产物** | 编辑器内联进主文件，无内部分块 → 彻底告别浏览器缓存分块导致的"改了没生效" |
| 7 | **可视化编辑器增强** | 新增 model 覆盖、摆风角度实体、左右步进按键实体等编辑字段 |

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
| `turn_left_entity` | | 左步进按键实体（button），绑定后左箭头按下即触发 |
| `turn_right_entity` | | 右步进按键实体（button）|
| `turn_left_name` / `turn_right_name` | | 步进按钮文字，默认 左步进 / 右步进 |
| `model` | | 覆盖型号检测（如 `dmaker.fan.p5`），一般不需要 |
| `disable_animation` / `force_sleep_mode_support` / `hide_led_button` | | 同原版 |

### 示例（米家集成的米家智能直流变频落地扇）

```yaml
type: custom:fan-xiaomi
entity: fan.dmaker_fan_p5
name: 客厅风扇
angle_entity: select.dmaker_fan_p5_horizontal_swing_included_angle
turn_left_entity: button.dmaker_fan_p5_turn_left
turn_right_entity: button.dmaker_fan_p5_turn_right
```

## 已验证机型

- 米家智能直流变频落地扇 1X（dmaker.fan.p5c，米家集成 / 小米官方集成）
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
