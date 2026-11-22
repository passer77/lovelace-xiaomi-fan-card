import { LitElement, html, TemplateResult, css, CSSResultGroup } from "lit";
import { HomeAssistant, fireEvent, LovelaceCardEditor } from "custom-card-helpers";
import { defaultConfig, FanXiaomiCardConfig, platforms } from "./config";
import { customElement, property, state } from "lit/decorators";

@customElement("fan-xiaomi-card-editor")
export class FanXiaomiCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private config!: Partial<FanXiaomiCardConfig>;

  public setConfig(config: FanXiaomiCardConfig): void {
    this.config = config;
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
        <label>Name (Optional)</label>
        <input
          type="text"
          .value=${config.name}
          .configValue=${"name"}
          @input=${this._valueChanged}
        />
      </div>
      <div class="field">
        <label>Platform</label>
        <select .configValue=${"platform"} @change=${this._valueChanged}>
          ${platforms.map((p) => {
            return html`<option .value=${p} ?selected=${p === config.platform}>${p}</option>`;
          })}
        </select>
      </div>
      <div class="field">
        <label>Entity (Required)</label>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${config.entity}
          .configValue=${"entity"}
          @value-changed=${this._valueChanged}
          allow-custom-entity
        ></ha-entity-picker>
      </div>
      <div class="field">
        <label>Swing angle entity (Optional: select/number)</label>
        <input
          type="text"
          .value=${config.angle_entity}
          .configValue=${"angle_entity"}
          @input=${this._valueChanged}
          placeholder="select.xxx_horizontal_swing_included_angle"
        />
      </div>
      <div class="field">
        <label>Turn LEFT button entity (Optional)</label>
        <input
          type="text"
          .value=${config.turn_left_entity}
          .configValue=${"turn_left_entity"}
          @input=${this._valueChanged}
          placeholder="button.xxx_turn_left"
        />
      </div>
      <div class="field">
        <label>Turn RIGHT button entity (Optional)</label>
        <input
          type="text"
          .value=${config.turn_right_entity}
          .configValue=${"turn_right_entity"}
          @input=${this._valueChanged}
          placeholder="button.xxx_turn_right"
        />
      </div>
      <div class="field half">
        <label>Turn LEFT label</label>
        <input
          type="text"
          .value=${config.turn_left_name}
          .configValue=${"turn_left_name"}
          @input=${this._valueChanged}
        />
      </div>
      <div class="field half">
        <label>Turn RIGHT label</label>
        <input
          type="text"
          .value=${config.turn_right_name}
          .configValue=${"turn_right_name"}
          @input=${this._valueChanged}
        />
      </div>
      <div class="field">
        <label class="check">
          <input
            type="checkbox"
            .checked=${config.force_sleep_mode_support}
            .configValue=${"force_sleep_mode_support"}
            @change=${this._valueChanged}
          />
          Show sleep mode button
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
          Hide LED button
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
