import { LitElement, html, TemplateResult, css, CSSResultGroup } from "lit";
import { HomeAssistant, fireEvent, LovelaceCardEditor } from "custom-card-helpers";
import { defaultConfig, FanXiaomiCardConfig, platforms } from "./config";

const i18n = (hass: any, en: string, zh: string): string =>
  hass && String(hass.language || "").toLowerCase().startsWith("zh") ? zh : en;
import { customElement, property, state } from "lit/decorators";

@customElement("fan-xiaomi-card-editor")
export class FanXiaomiCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private config!: Partial<FanXiaomiCardConfig>;

  public setConfig(config: FanXiaomiCardConfig): void {
    this.config = config;
  }

  private _autoFilled = new Set<string>();

  protected updated(changedProperties: Map<string, unknown>): void {
    if (
      changedProperties.has("hass") &&
      this.hass &&
      this.config &&
      this.config.entity &&
      this._autoFilled.size === 0
    ) {
      this._autoMatch(this.config.entity);
    }
  }

  private async _autoMatch(entity: string): Promise<void> {
    if (!this.hass || !entity) {
      return;
    }
    try {
      const registry = (await this.hass.callWS({
        type: "config/entity_registry/list",
      })) as any[];
      const fanEntry = registry.find((e) => e.entity_id === entity);
      if (!fanEntry || !fanEntry.device_id) {
        return;
      }
      const same = registry.filter((e) => e.device_id === fanEntry.device_id);
      const dom = (e) => e.entity_id.split(".")[0];
      const pick = (pred) => {
        const hit = same.find(pred);
        return hit ? hit.entity_id : undefined;
      };
      const map: Record<string, string | undefined> = {
        angle_entity: pick(
          (e) =>
            ["select", "number"].includes(dom(e)) &&
            (e.entity_id.includes("_oscillation_angle") ||
              e.entity_id.includes("_horizontal_swing_included_angle"))
        ),
        timer_entity: pick(
          (e) =>
            ["select", "number"].includes(dom(e)) &&
            (e.entity_id.includes("_delay_off_countdown") ||
              e.entity_id.includes("countdown_time") ||
              e.entity_id.includes("off_delay_time"))
        ),
        child_lock_entity: pick(
          (e) => e.entity_id.startsWith("switch.") && e.entity_id.includes("_physical_control")
        ),
        turn_left_entity: pick(
          (e) =>
            e.entity_id.startsWith("button.") &&
            (e.entity_id.includes("_turn_left") || e.entity_id.includes("_zuo"))
        ),
        turn_right_entity: pick(
          (e) =>
            e.entity_id.startsWith("button.") &&
            (e.entity_id.includes("_turn_right") || e.entity_id.includes("_you"))
        ),
      };
      const cur = { ...defaultConfig, ...this.config };
      const changed: Record<string, string> = {};
      for (const [key, val] of Object.entries(map)) {
        if (!val) {
          continue;
        }
        const owned = this._autoFilled.has(key);
        if (cur[key] && !owned) {
          continue;
        }
        if (cur[key] !== val) {
          changed[key] = val;
        }
        this._autoFilled.add(key);
      }
      if (Object.keys(changed).length) {
        this.config = { ...this.config, ...changed };
        fireEvent(this, "config-changed", { config: this.config });
      }
    } catch (e) {
      /* registry unavailable */
    }
  }

  protected render(): TemplateResult | void {
    if (!this.hass) {
      return html``;
    }

    const config = {
      ...defaultConfig,
      ...this.config,
    };

    return html`
      <div class="field">
        <label>${i18n(this.hass, "Name (Optional)", "名称（可选）")}</label>
        <input
          type="text"
          .value=${config.name}
          .configValue=${"name"}
          @input=${this._valueChanged}
        />
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Platform", "平台")}</label>
        <select .configValue=${"platform"} @change=${this._valueChanged}>
          ${platforms.map((p) => {
            return html`<option .value=${p} ?selected=${p === config.platform}>${p}</option>`;
          })}
        </select>
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Entity (Required)", "实体（必选）")}</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.entity}
          .configValue=${"entity"}
          @value-changed=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Swing angle entity (Optional: select/number)", "摆风角度实体（可选：select/number）")}</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.angle_entity}
          .configValue=${"angle_entity"}
          @value-changed=${this._valueChanged}
          .includeDomains=${["select", "number"]}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Delay-off timer entity (Optional: select/number)", "定时实体（可选：select/number）")}</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.timer_entity}
          .configValue=${"timer_entity"}
          @value-changed=${this._valueChanged}
          .includeDomains=${["select", "number"]}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Child lock entity (Optional: switch)", "童锁实体（可选：switch）")}</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.child_lock_entity}
          .configValue=${"child_lock_entity"}
          @value-changed=${this._valueChanged}
          .includeDomains=${["switch"]}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Turn LEFT button entity (Optional)", "左步进按键实体（可选）")}</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.turn_left_entity}
          .configValue=${"turn_left_entity"}
          @value-changed=${this._valueChanged}
          .includeDomains=${["button"]}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="field">
        <label>${i18n(this.hass, "Turn RIGHT button entity (Optional)", "右步进按键实体（可选）")}</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.turn_right_entity}
          .configValue=${"turn_right_entity"}
          @value-changed=${this._valueChanged}
          .includeDomains=${["button"]}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
            <div class="field">
        <label class="check">
          <input
            type="checkbox"
            .checked=${config.force_sleep_mode_support}
            .configValue=${"force_sleep_mode_support"}
            @change=${this._valueChanged}
          />
          ${i18n(this.hass, "Show sleep mode button", "显示睡眠模式按钮")}
        </label>
      </div>
      <div class="field">
        <label class="check">
          <input
            type="checkbox"
            .checked=${config.hide_led_button}
            .configValue=${"hide_led_button"}
            @change=${this._valueChanged}
          />
          ${i18n(this.hass, "Hide LED button", "隐藏 LED 按钮")}
        </label>
      </div>
    `;
  }

  private _valueChanged(ev): void {
    if (!this.config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (target.configValue) {
      const newValue = target.type === "checkbox" ? target.checked : target.value;
      if (defaultConfig[target.configValue] === newValue) {
        const tmpConfig = { ...this.config };
        delete tmpConfig[target.configValue];
        this.config = tmpConfig;
      } else {
        this.config = {
          ...this.config,
          [target.configValue]: newValue,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this.config });
    if (target.configValue === "entity" && target.value) {
      this._autoFilled.clear();
      this._autoMatch(target.value);
    }
  }

  static styles: CSSResultGroup = css`
    .field {
      margin-bottom: 14px;
      display: block;
    }
    .field.half {
      display: inline-block;
      width: 48%;
      margin-right: 2%;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      color: var(--secondary-text-color, #666);
    }
    label.check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--primary-text-color, #111);
    }
    input[type="text"],
    select {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #111);
      border: 1px solid var(--divider-color, #ccc);
      border-radius: 4px;
    }
    ha-entity-picker {
      display: block;
    }
  `;
}
