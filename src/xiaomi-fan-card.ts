/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup, HTMLTemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant, hasConfigOrEntityChanged, handleAction, LovelaceCardEditor } from "custom-card-helpers"; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import { FanXiaomiCardConfig, defaultConfig } from "./config";


// Add the card to the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "fan-xiaomi",
  name: "小米风扇卡片 (Xiaomi Fan Card)",
  preview: true,
  description: "Xiaomi Smartmi Fan Lovelace card for HASS/Home Assistant.",
});

type SupportedAttributes = {
  angle: boolean;
  childLock: boolean;
  timer: boolean;
  rotationAngle: boolean;
  speedLevels: number;
  naturalSpeed: boolean;
  supportedAngles: number[];
  sleepMode: boolean;
  led: boolean;
  speedIncreaseDecreaseButtons: boolean;
};

type DeviceEntities = {
  angle?: string;
  timer?: string;
  childLock?: string;
  ledNumber?: string;
  ledSelect?: string;
  ledSwitch?: string;
  temperature?: string;
  humidity?: string;
  powerSupply?: string;
};

const entityFilters: { [name in keyof Required<DeviceEntities>]: { prefix: string; suffix: string } } = {
  angle: {
    prefix: "number.",
    suffix: "_oscillation_angle",
  },
  childLock: {
    prefix: "switch.",
    suffix: "_child_lock",
  },
  timer: {
    prefix: "number.",
    suffix: "_delay_off_countdown",
  },
  ledNumber: {
    prefix: "number.",
    suffix: "_led_brightness",
  },
  ledSelect: {
    prefix: "select.",
    suffix: "_led_brightness",
  },
  ledSwitch: {
    prefix: "switch.",
    suffix: "_led",
  },
  temperature: {
    prefix: "sensor.",
    suffix: "_temperature",
  },
  humidity: {
    prefix: "sensor.",
    suffix: "_humidity",
  },
  powerSupply: {
    prefix: "binary_sensor.",
    suffix: "_power_supply",
  },
};

function createFanBladeHtml(): HTMLTemplateResult[] {
  const result: HTMLTemplateResult[] = [];
  for (let i = 1; i < 73; i++) {
    result.push(html`<div class="fan ang${i}"></div>`);
  }
  for (let i = 1; i < 73; i += 2) {
    result.push(html`<div class="fan1 ang${i}"></div>`);
  }
  return result;
}

const i18n = (hass: any, en: string, zh: string): string =>
  hass && String(hass.language || "").toLowerCase().startsWith("zh") ? zh : en;

let registryCache: { entity_id: string; device_id: string }[] | null = null;
let registryPromise: Promise<{ entity_id: string; device_id: string }[]> | null = null;
const deviceEntitiesCache = new Map<string, DeviceEntities>();

function delayOffCountdownText(hass: any, delay_off_countdown: number, model: string): string {
  let timer_display = i18n(hass, "Off", "关");
  if (delay_off_countdown) {
    const total_mins = ["dmaker.fan.p15"].includes(model) ? delay_off_countdown / 60 : delay_off_countdown;

    const hours = Math.floor(total_mins / 60);
    const mins = Math.floor(total_mins % 60);
    if (hours) {
      if (mins) {
        timer_display = `${hours}h ${mins}m`;
      } else {
        timer_display = `${hours}h`;
      }
    } else {
      timer_display = `${mins}m`;
    }
  }
  return timer_display;
}

@customElement("fan-xiaomi")
export class FanXiaomiCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./xiaomi-fan-card-editor");
    return document.createElement("fan-xiaomi-card-editor");
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      ...defaultConfig,
      name: "Xiaomi Fan",
    };
  }

  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  private isConfigureAsyncFinished = false;

  @state() private deviceEntities: DeviceEntities = {};

  @state() private supportedAttributes: SupportedAttributes = {
    angle: true,
    childLock: true,
    timer: true,
    rotationAngle: true,
    speedLevels: 4,
    naturalSpeed: true,
    supportedAngles: [30, 60, 90, 120],
    sleepMode: false,
    led: false,
    speedIncreaseDecreaseButtons: false,
  };

  @state() private config!: FanXiaomiCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: FanXiaomiCardConfig): void {
    if (!config.entity) {
      throw new Error("You must specify an entity");
    }

    this.config = {
      ...defaultConfig,
      ...config,
    };

    this.isConfigureAsyncFinished = false;
    if (this.hass) {
      this.configureAsync();
    }
  }

  private getModel() {
    if (this.config.model) {
      return this.config.model;
    }
    if (this.config.platform === "default") {
      return null;
    }
    return this.hass.states[this.config.entity].attributes["model"];
  }

  private setChildLock(on) {
    if (this.deviceEntities.childLock) {
      this.hass.callService("switch", on ? "turn_on" : "turn_off", {
        entity_id: this.deviceEntities.childLock,
      });
    } else {
      this.hass.callService(this.config.platform, on ? "fan_set_child_lock_on" : "fan_set_child_lock_off");
    }
  }

  private getChildLock() {
    if (this.deviceEntities.childLock) {
      return this.hass.states[this.deviceEntities.childLock].state === "on";
    }
    return this.hass.states[this.config.entity].attributes["child_lock"];
  }

  private setTimer(value: number) {
    if (this.deviceEntities.timer) {
      const timerEntity = this.deviceEntities.timer;
      if (timerEntity.startsWith("select.")) {
        this.hass.callService("select", "select_option", {
          entity_id: timerEntity,
          option: String(value),
        });
      } else {
        this.hass.callService("number", "set_value", {
          entity_id: timerEntity,
          value: value,
        });
      }
    } else {
      this.hass.callService(this.config.platform, "fan_set_delay_off", {
        entity_id: this.config.entity,
        delay_off_countdown: value,
      });
    }
  }

  private getTimer(): number {
    if (this.deviceEntities.timer) {
      let minutesRemaining = Number(this.hass.states[this.deviceEntities.timer].state);
      const max = this.hass.states[this.deviceEntities.timer].attributes["max"];
      if (max && minutesRemaining > max) {
        // Work around a bug where state is reported in seconds despite the unit being minutes
        minutesRemaining = Math.ceil(minutesRemaining / 60.0);
      }
      return minutesRemaining;
    }
    return Number(this.hass.states[this.config.entity].attributes["delay_off_countdown"]);
  }

  private setAngle(value) {
    if (this.deviceEntities.angle) {
      const angleEntity = this.deviceEntities.angle;
      if (angleEntity.startsWith("select.")) {
        this.hass.callService("select", "select_option", {
          entity_id: angleEntity,
          option: String(value),
        });
      } else {
        this.hass.callService("number", "set_value", {
          entity_id: angleEntity,
          value: value,
        });
      }
    } else {
      this.hass.callService(this.config.platform, "fan_set_oscillation_angle", {
        entity_id: this.config.entity,
        angle: value,
      });
    }
  }

  private getAngle() {
    if (this.deviceEntities.angle) {
      return Number(this.hass.states[this.deviceEntities.angle].state);
    }
    return this.hass.states[this.config.entity].attributes["angle"];
  }

  private setOscillation(on) {
    this.hass.callService("fan", "oscillate", {
      entity_id: this.config.entity,
      oscillating: on,
    });
  }

  private getOscillation() {
    return this.hass.states[this.config.entity].attributes["oscillating"];
  }

  private getSpeedPercentage(): number {
    return Number(this.hass.states[this.config.entity].attributes["percentage"]);
  }

  private getSpeedLevel(): number {
    const speedCount = this.supportedAttributes.speedLevels;
    return Math.ceil((this.getSpeedPercentage() / 100) * speedCount);
  }

  private setPresetMode(value) {
    if (this.config.platform === "default") {
      const modes: string[] = this.hass.states[this.config.entity].attributes["preset_modes"] || [];
      const resolve = (wanted: string): string => {
        const hit = modes.find((m) => m.trim().toLowerCase() === wanted.trim().toLowerCase());
        return hit !== undefined ? hit : wanted;
      };
      const canonical = String(value).trim().toLowerCase();
      const target = /^nature$|^自然风$/.test(canonical)
        ? resolve("自然风")
        : /^normal$|^直吹风$|^direct$/.test(canonical)
        ? resolve("直吹风")
        : resolve(value);
      this.hass.callService("fan", "set_preset_mode", {
        entity_id: this.config.entity,
        preset_mode: target,
      });
    } else {
      if (value === "Nature") {
        this.hass.callService(this.config.platform, "fan_set_natural_mode_on", {
          entity_id: this.config.entity,
        });
      } else {
        this.hass.callService(this.config.platform, "fan_set_natural_mode_off", {
          entity_id: this.config.entity,
        });
      }
    }
  }

  /**
   * @returns The fan's preset (nature/normal) mode as a lowercase string.
   */
  private getPresetMode(): "nature" | "normal" | undefined {
    const attrs = this.hass.states[this.config.entity].attributes;
    if (this.config.platform === "default") {
      const raw = attrs["preset_mode"]?.trim();
      if (!raw) {
        return undefined;
      }
      if (/自然风|^nature$|^natural$/i.test(raw)) {
        return "nature";
      }
      return raw === "直吹风" ? "normal" : raw.toLowerCase();
    }
    return attrs["mode"]?.toLowerCase();
  }

  private setLed(on: boolean) {
    if (this.deviceEntities.ledNumber) {
      this.hass.callService("number", "set_value", {
        entity_id: this.deviceEntities.ledNumber,
        value: on ? 100 : 0,
      });
    } else if (this.deviceEntities.ledSelect) {
      this.hass.callService("select", "select_option", {
        entity_id: this.deviceEntities.ledSelect,
        option: on ? "bright" : "off",
      });
    } else if (this.deviceEntities.ledSwitch) {
      if (on) {
        this.hass.callService("switch", "turn_on", {
          entity_id: this.deviceEntities.ledSwitch,
        });
      } else {
        this.hass.callService("switch", "turn_off", {
          entity_id: this.deviceEntities.ledSwitch,
        });
      }
    } else {
      this.hass.callService(this.config.platform, on ? "fan_set_led_on" : "fan_set_led_off", {
        entity_id: this.config.entity,
      });
    }
  }

  private getLed() {
    if (this.deviceEntities.ledNumber) {
      return Number(this.hass.states[this.deviceEntities.ledNumber].state) > 0;
    } else if (this.deviceEntities.ledSelect) {
      return this.hass.states[this.deviceEntities.ledSelect].state !== "off";
    } else if (this.deviceEntities.ledSwitch) {
      return this.hass.states[this.deviceEntities.ledSwitch].state === "on";
    }
    return this.hass.states[this.config.entity].attributes["led_brightness"] < 2;
  }

  private getTemperature() {
    if (this.deviceEntities.temperature) {
      return this.hass.states[this.deviceEntities.temperature].state;
    }
    return undefined;
  }

  private getHumidity() {
    if (this.deviceEntities.humidity) {
      return this.hass.states[this.deviceEntities.humidity].state;
    }
    return undefined;
  }

  private getPowerSupply() {
    if (this.deviceEntities.powerSupply) {
      return this.hass.states[this.deviceEntities.powerSupply].state === "on";
    }
    return undefined;
  }

  private async findDeviceEntities(): Promise<DeviceEntities> {
    const cached = deviceEntitiesCache.get(this.config.entity);
    if (cached) {
      return cached;
    }
    if (!registryPromise) {
      registryPromise = this.hass
        .callWS<{ entity_id: string; device_id: string }[]>({
          type: "config/entity_registry/list",
        })
        .then((entities) => {
          registryCache = entities;
          return entities;
        });
    }
    const allEntities = registryCache ?? (await registryPromise);
    const fanApiEntity = allEntities.find((e) => e.entity_id === this.config.entity);
    if (!fanApiEntity) {
      return {};
    }
    const deviceEntities = allEntities.filter((e) => e.device_id === fanApiEntity.device_id);

    const deviceEntityIds: DeviceEntities = {};
    for (const entityName of Object.keys(entityFilters)) {
      const { prefix, suffix } = entityFilters[entityName];
      deviceEntityIds[entityName] =
        entityName === "angle" && this.config.angle_entity
          ? this.config.angle_entity
          : entityName === "timer" && this.config.timer_entity
          ? this.config.timer_entity
          : deviceEntities.find(
              (e) =>
                (e.entity_id.startsWith(prefix) && e.entity_id.endsWith(suffix)) ||
                (entityName === "angle" &&
                  (e.entity_id.startsWith("number.") || e.entity_id.startsWith("select.")) &&
                  (e.entity_id.includes("_oscillation_angle") ||
                    e.entity_id.includes("_horizontal_swing_included_angle"))) ||
                (entityName === "timer" &&
                  (e.entity_id.startsWith("number.") || e.entity_id.startsWith("select.")) &&
                  (e.entity_id.includes("_delay_off_countdown") ||
                    e.entity_id.includes("countdown_time") ||
                    e.entity_id.includes("off_delay_time"))) ||
                (entityName === "childLock" &&
                  e.entity_id.startsWith("switch.") &&
                  e.entity_id.includes("_physical_control"))
            )?.entity_id;
    }

    deviceEntitiesCache.set(this.config.entity, deviceEntityIds);
    return deviceEntityIds;
  }

  private checkFanFeatures(attributes) {
    if (
      attributes.preset_mode &&
      attributes.preset_modes &&
      attributes.preset_modes.some(
        (m) => m.trim().toLowerCase() === "nature" || m.trim() === "自然风"
      )
    ) {
      this.supportedAttributes.naturalSpeed = true;
    }
  }

  private checkFanAuxFeatures() {
    if (this.deviceEntities.angle) {
      this.supportedAttributes.angle = true;
      const attr = this.hass.states[this.deviceEntities.angle].attributes;
      if (Array.isArray(attr.options)) {
        this.supportedAttributes.supportedAngles = (attr.options as string[]).map(Number);
      } else if (attr.min && attr.max && attr.step) {
        const angles: number[] = [];
        for (let a = attr.min as number; a <= attr.max; a += attr.step) {
          angles.push(a);
        }
        this.supportedAttributes.supportedAngles = angles;
      }
    }

    if (this.deviceEntities.timer) {
      this.supportedAttributes.timer = true;
    }

    if (this.deviceEntities.childLock) {
      this.supportedAttributes.childLock = true;
    }

    if (this.deviceEntities.ledNumber || this.deviceEntities.ledSelect || this.deviceEntities.ledSwitch) {
      this.supportedAttributes.led = true;
    }
  }

  private async configureAsync() {
    if (this.config.platform === "default") {
      const fanEntity = this.hass.states[this.config.entity];
      if (!fanEntity) {
        return;
      }

      this.deviceEntities = await this.findDeviceEntities();
      this.checkFanFeatures(fanEntity.attributes);
      this.checkFanAuxFeatures();
    } else {
      const state = this.hass.states[this.config.entity];
      const attrs = state.attributes;

      if (["dmaker.fan.p5", "dmaker.fan.p15", "dmaker.fan.p18", "dmaker.fan.p33"].includes(attrs["model"])) {
        this.supportedAttributes.supportedAngles = [30, 60, 90, 120, 140];
        //this.supportedAttributes.led = true;
      }

      //temp solution for FA1 fan until proper fan support is added in the upstream
      if (["zhimi.fan.fa1"].includes(attrs["model"])) {
        this.supportedAttributes.speedIncreaseDecreaseButtons = true;
        this.supportedAttributes.angle = false;
        this.supportedAttributes.childLock = false;
        this.supportedAttributes.rotationAngle = false;
        this.supportedAttributes.speedLevels = 3;
        this.supportedAttributes.naturalSpeed = false;
        this.supportedAttributes.timer = false;
      }
      //temp solution for Xiaomi Smart Standing Fan 2 Lite fan speed until proper fan support is added in the upstream
      if (["dmaker.fan.1c"].includes(attrs["model"])) {
        this.supportedAttributes.speedLevels = 3;
        this.supportedAttributes.angle = false;
        this.supportedAttributes.rotationAngle = false;
      }
      if (["leshow.fan.ss4"].includes(attrs["model"])) {
        this.supportedAttributes.angle = false;
        this.supportedAttributes.childLock = false;
        this.supportedAttributes.rotationAngle = false;
        this.supportedAttributes.naturalSpeed = false;
        this.supportedAttributes.sleepMode = true;
      }

      //trick to support of 'any' fan
      if (this.config.force_sleep_mode_support) {
        this.supportedAttributes.sleepMode = true;
      }
    }

    this.isConfigureAsyncFinished = true;
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    } else if (!this.isConfigureAsyncFinished && this.hass) {
      this.configureAsync();
      return this.isConfigureAsyncFinished;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (oldHass && Object.values(this.deviceEntities).some((e) => oldHass.states[e] !== this.hass.states[e])) {
      // The state or attributes of one of the related device entities has changed
      return true;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  @state() private _dragPct?: number;

  private _onSpeedDrag(ev: Event): void {
    this._dragPct = Number((ev.target as HTMLInputElement).value);
  }

  private _onSpeedSet(ev: Event): void {
    const value = Number((ev.target as HTMLInputElement).value);
    this._dragPct = undefined;
    this.hass.callService("fan", "set_percentage", {
      entity_id: this.config.entity,
      percentage: value,
    });
  }

  protected render(): TemplateResult | void {
    const state = this.hass.states[this.config.entity];

    return html`
      <ha-card
        .header=${this.config.name || state?.attributes["friendly_name"] || ""}
        @click=${this.onCardTitleClick}
        tabindex="0"
        .label=${`Xiaomi Fan: ${this.config.entity || "No Entity Defined"}`}
      >
        ${state === undefined || state.state === "unavailable"
          ? html`<hui-warning
              >Fan entity ${this.config.entity}
              ${state.state === "unavailable" ? "is unavailable" : "was not found"}.</hui-warning
            >`
          : this.renderContent()}
      </ha-card>
    `;
  }

  private renderContent(): TemplateResult {
    const state = this.hass.states[this.config.entity];

    const speed_percentage = this.getSpeedPercentage();
    const speedStep =
      Number(this.hass.states[this.config.entity]?.attributes?.percentage_step) || 1;
    const child_lock = this.getChildLock();
    const oscillating = this.getOscillation();
    const delay_off_countdown = this.getTimer();
    const angle = this.getAngle();
    const preset_mode = this.getPresetMode();
    const model = this.getModel();
    const led = this.getLed();
    const temperature = this.getTemperature();
    const humidity = this.getHumidity();
    const power_supply = this.getPowerSupply();

    const speedLevel = this.getSpeedLevel();

    return html` <div class="fan-xiaomi-panel" @click=${(ev) => ev.stopPropagation()}>
      ${this.config.disable_animation
        ? ""
        : html`<div class="fanbox-container">
            <div class="var-sensors">
              ${temperature !== undefined ? html`${temperature}°C<br />` : ""}
              ${humidity !== undefined ? html`${humidity}%<br />` : ""}
            </div>
            ${power_supply !== undefined
              ? html`<div class="var-power-supply">
                  <ha-icon icon="mdi:power-plug-${power_supply ? "" : "off-"}outline"></ha-icon>
                </div>`
              : ""}
            <div class="fanbox ${state.state === "on" ? "active" : ""} ${oscillating ? "oscillation" : ""}">
              <div class="blades level${state.state === "on" ? Math.max(1, speedLevel) : 0}">
                <div class="b1 ang1"></div>
                <div class="b2 ang25"></div>
                <div class="b3 ang49"></div>
              </div>
              ${createFanBladeHtml()}
              <div class="c2"></div>
              <div class="c3 ${led ? "active" : ""}">
                <span class="icon-waper">
                  <ha-icon icon="mdi:power"></ha-icon>
                </span>
              </div>
              <div class="c1" @click=${this.toggleOnOff}></div>
              ${this.config.turn_left_entity ||
                this.config.turn_right_entity ||
                (this.supportedAttributes.rotationAngle &&
                  (this.config.platform !== "default" ||
                    void 0 !== this.hass.states[this.config.entity].attributes["direction"]))
                ? html`<div class="chevron left" @click=${this.rotateLeft}>
                      <span class="icon-waper">
                        <ha-icon icon="mdi:chevron-left"></ha-icon>
                      </span>
                    </div>
                    <div class="chevron right" @click=${this.rotateRight}>
                      <span class="icon-waper">
                        <ha-icon icon="mdi:chevron-right"></ha-icon>
                      </span>
                    </div>`
                : ""}
            </div>
          </div>`}
      <div class="attr-row upper-container">
        ${child_lock !== undefined
          ? html`<div class="attr button-childlock" @click=${this.toggleChildLock}>
              <p class="attr-title">${i18n(this.hass, "Child Lock", "童锁")}</p>
              <p class="attr-value var-childlock">${child_lock ? i18n(this.hass, "On", "开") : i18n(this.hass, "Off", "关")}</p>
            </div>`
          : ""}
        ${this.supportedAttributes.angle
          ? html`<div class="attr button-angle" @click=${this.toggleOscillationAngle}>
              <p class="attr-title">${i18n(this.hass, "Angle(°)", "夹角(°)")}</p>
              <p class="attr-value var-angle">${angle}</p>
            </div>`
          : ""}
        ${delay_off_countdown !== undefined
          ? html`<div class="attr button-timer" @click=${this.toggleTimer}>
              <p class="attr-title">${i18n(this.hass, "Timer", "定时")}</p>
              <p class="attr-value var-timer">${delayOffCountdownText(this.hass, delay_off_countdown, model)}</p>
            </div>`
          : ""}
      </div>

      ${speed_percentage !== undefined
        ? html`<div class="speed-slider ${state.state === "on" ? "on" : ""}">
            <input
              type="range"
              min="0"
              max="100"
              step="${speedStep}"
              .value="${String(this._dragPct ?? (speed_percentage || 0))}"
              style="--pct: ${this._dragPct ?? (speed_percentage || 0)}%"
              ?disabled=${state.state !== "on"}
              @input=${this._onSpeedDrag}
              @change=${this._onSpeedSet}
            />
          </div>`
        : ""}
      <div class="op-row">
        ${this.supportedAttributes.speedIncreaseDecreaseButtons
          ? html`<div class="op var-speedup" @click=${this.increaseSpeed}>
                <button>
                  <span class="icon-waper">
                    <ha-icon icon="mdi:fan-chevron-up"></ha-icon>
                  </span>
                  ${i18n(this.hass, "Speed up", "加速")}
                </button>
              </div>
              <div class="op var-speeddown" @click=${this.decreaseSpeed}>
                <button>
                  <span class="icon-waper">
                    <ha-icon icon="mdi:fan-chevron-down"></ha-icon>
                  </span>
                  ${i18n(this.hass, "Speed down", "减速")}
                </button>
              </div>`
          : html`<div
                class="op var-speed ${speedLevel > 0 && state.state === "on" ? "active" : ""}"
                @click=${this.toggleSpeedLevel}
              >
                <button>
                  <span class="icon-waper">
                    <ha-icon icon="mdi:numeric-${state.state === "on" ? speedLevel : 0}-box-outline"></ha-icon>
                  </span>
                  ${i18n(this.hass, "Speed", "速度")}
                </button>
              </div>
              <div class="op var-oscillating ${oscillating ? "active" : ""}" @click=${this.toggleOscillation}>
                <button>
                  <span class="icon-waper">
                    <ha-icon icon="mdi:debug-step-over"></ha-icon>
                  </span>
                  ${i18n(this.hass, "Oscillate", "摆头")}
                </button>
              </div>`}
        ${this.supportedAttributes.naturalSpeed
          ? html`<div
              class="op var-natural ${preset_mode === "nature" ? "active" : ""}"
              @click=${this.toggleNatureMode}
            >
              <button>
                <span class="icon-waper">
                  <ha-icon icon=${preset_mode === "nature" ? "mdi:leaf" : "mdi:weather-windy"}></ha-icon>
                </span>
                ${preset_mode === "nature" ? i18n(this.hass, "Natural", "自然风") : i18n(this.hass, "Normal", "直吹风")}
              </button>
            </div>`
          : ""}
        ${this.supportedAttributes.sleepMode
          ? html`<div class="op var-sleep ${speed_percentage === 1 ? "active" : ""}" @click=${this.toggleSleepMode}>
              <button>
                <span class="icon-waper">
                  <ha-icon icon="mdi:power-sleep"></ha-icon>
                </span>
                ${i18n(this.hass, "Sleep", "睡眠")}
              </button>
            </div>`
          : ""}
        ${this.supportedAttributes.led && !this.config.hide_led_button
          ? html`<div class="op var-led ${led ? "active" : ""}" @click=${this.toggleLed}>
              <button>
                <span class="icon-waper">
                  <ha-icon icon="mdi:lightbulb-outline"></ha-icon>
                </span>
                LED
              </button>
            </div>`
          : ""}
      </div>
    </div>`;
  }

  private onCardTitleClick(): void {
    if (this.hass && this.config) {
      handleAction(this, this.hass, this.config, "click");
    }
  }

  private toggleOnOff(): void {
    this.hass.callService("fan", "toggle", {
      entity_id: this.config.entity,
    });
  }

  private rotateLeft(): void {
    const turnEntity = this.config.turn_left_entity;
    if (turnEntity) {
      this.hass.callService("button", "press", { entity_id: turnEntity });
      return;
    }
    this.hass.callService("fan", "set_direction", {
      entity_id: this.config.entity,
      direction: this.config.platform === "default" ? "reverse" : "left",
    });
  }

  private rotateRight(): void {
    const turnEntity = this.config.turn_right_entity;
    if (turnEntity) {
      this.hass.callService("button", "press", { entity_id: turnEntity });
      return;
    }
    this.hass.callService("fan", "set_direction", {
      entity_id: this.config.entity,
      direction: this.config.platform === "default" ? "forward" : "right",
    });
  }

  /**
   * Rotate through speed levels
   * e.g. if at level 1, jumps to level 2
   * If at the maximum speed, this turns the fan of (i.e. "level 0") as this is the only way to turn off
   *   the fan when animations/fanbox is disabled.
   *
   * When animations/fanbox is enabled, max level jumps to level 1.
   * Jump from level 0 - turns on the fan
   */
  private toggleSpeedLevel(): void {
    const currentLevel = this.getSpeedLevel();

    const newLevel =
      currentLevel >= this.supportedAttributes.speedLevels
        ? this.config.disable_animation
          ? this.hass.states[this.config.entity].state === "off"
            ? 1
            : 0
          : 1
        : currentLevel + 1;
    const newPercentage = (newLevel / this.supportedAttributes.speedLevels) * 100;

    this.hass.callService("fan", "set_percentage", {
      entity_id: this.config.entity,
      percentage: newPercentage,
    });
  }

  private increaseSpeed() {
    this.hass.callService("fan", "increase_speed", {
      entity_id: this.config.entity,
    });
  }

  private decreaseSpeed() {
    this.hass.callService("fan", "decrease_speed", {
      entity_id: this.config.entity,
    });
  }

  private toggleOscillationAngle() {
    const oldAngle = this.getAngle();
    let newAngle;
    const curAngleIndex = this.supportedAttributes.supportedAngles.indexOf(oldAngle);
    if (curAngleIndex >= 0 && curAngleIndex < this.supportedAttributes.supportedAngles.length - 1) {
      newAngle = this.supportedAttributes.supportedAngles[curAngleIndex + 1];
    } else {
      newAngle = this.supportedAttributes.supportedAngles[0];
    }

    this.setAngle(newAngle);
  }

  private toggleTimer() {
    const minutesRemaining = this.getTimer();
    const fullHoursRemaining = Math.floor(minutesRemaining / 60);
    const newTimerHours = fullHoursRemaining >= 8 ? 0 : fullHoursRemaining + 1;
    this.setTimer(newTimerHours * 60);
  }

  private toggleChildLock() {
    const currentValue = this.getChildLock();
    this.setChildLock(!currentValue);
  }

  private toggleNatureMode() {
    const currentlyEnabled = this.getPresetMode() === "nature";
    this.setPresetMode(currentlyEnabled ? "Normal" : "Nature");
  }

  private toggleSleepMode() {
    if (this.getSpeedPercentage() === 1) {
      this.hass.callService("fan", "set_speed", {
        entity_id: this.config.entity,
        speed: "low",
      });
    } else {
      this.hass.callService("fan", "set_percentage", {
        entity_id: this.config.entity,
        percentage: 1,
      });
    }
  }

  private toggleLed() {
    const currentlOn = this.getLed();
    this.setLed(!currentlOn);
  }

  private toggleOscillation() {
    const currentlyOscillating = this.getOscillation();
    this.setOscillation(!currentlyOscillating);
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    const result: CSSResultGroup = [];

    for (let i = 1; i < 73; i++) {
      result.push(css`
        .ang${i} {
          transform: rotate(${(i - 1) * 5}deg);
        }
      `);
    }

    result.push(css`
      .offline {
        opacity: 0.3;
      }
      .loading {
        opacity: 0.6;
      }
      .icon {
        overflow: hidden;
        width: 2em;
        height: 2em;
        vertical-align: -0.15em;
        fill: gray;
      }
      .fan-xiaomi-panel {
        text-align: center;
      }
      p {
        margin: 0;
        padding: 0;
      }
      .title {
        margin-top: 20px;
        height: 35px;
        cursor: pointer;
      }
      .title p {
        margin: 0;
        padding: 0;
        font-weight: 700;
        font-size: 18px;
      }
      .title span {
        font-size: 9pt;
      }
      .attr-row {
        display: flex;
      }
      .attr-row .attr {
        width: 100%;
        padding-bottom: 2px;
        border-left: 1px solid #01be9e;
      }
      .attr-row .attr:first-child {
        border-left: none;
      }
      .attr-row .attr-title {
        font-size: 9pt;
      }
      .attr-row .attr-value {
        font-size: 14px;
      }
      .speed-slider {
        margin: 0;
      }
      .speed-slider input[type="range"] {
        width: 100%;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        border-radius: 2px;
        outline: none;
        background: #3a3d42;
      }
      .speed-slider input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #9aa0a6;
      }
      .speed-slider.on input[type="range"] {
        background: linear-gradient(to right, #01be9e var(--pct, 0%), #3a3d42 var(--pct, 0%));
      }
      .speed-slider.on input[type="range"]::-webkit-slider-thumb {
        background: #fff;
      }
      .speed-slider:not(.on) input[type="range"] {
        pointer-events: none;
      }
      .op-row {
        display: flex;
        padding: 4px 10px 10px;
      }
      .op-row .op {
        width: 100%;
      }
      .op-row .op button {
        outline: 0;
        border: none;
        background: 0 0;
        cursor: pointer;
      }
      .op-row .op .icon-waper {
        display: block;
        margin: 0 auto 5px;
        width: 30px;
        height: 30px;
      }
      .op-row .op.active button {
        color: #01be9e !important;
        text-shadow: 0 0 10px #01be9e;
      }
      .fanbox-container {
        position: relative;
      }
      .var-sensors {
        position: absolute;
        left: 10px;
        text-align: left;
        color: var(--secondary-text-color);
      }
      .var-power-supply {
        position: absolute;
        right: 10px;
        color: var(--secondary-text-color);
      }
      .fanbox {
        position: relative;
        margin: 10px auto;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: #80808061;
      }
      .fanbox.active.oscillation {
        animation: oscillate 8s infinite linear;
      }
      .fanbox.active .c3 {
        border-color: #01be9e;
      }
      .blades div {
        position: absolute;
        margin: 15% 0 0 15%;
        width: 35%;
        height: 35%;
        border-radius: 100% 50% 0;
        background: #989898;
        transform-origin: 100% 100%;
      }
      .blades {
        width: 100%;
        height: 100%;
      }
      .fanbox.active .blades.level1 {
        transform-origin: 50% 50%;
        animation: blades 9s infinite linear;
        transform-box: fill-box !important;
      }
      .fanbox.active .blades.level2 {
        transform-origin: 50% 50%;
        animation: blades 7s infinite linear;
        transform-box: fill-box !important;
      }
      .fanbox.active .blades.level3 {
        transform-origin: 50% 50%;
        animation: blades 5s infinite linear;
        transform-box: fill-box !important;
      }
      .fanbox.active .blades.level4 {
        transform-origin: 50% 50%;
        animation: blades 3s infinite linear;
        transform-box: fill-box !important;
      }
      .fan {
        top: 0;
        transform-origin: 0 250%;
      }
      .fan,
      .fan1 {
        position: absolute;
        left: 0;
        margin-left: 50%;
        width: 1%;
        height: 20%;
        background: #fff;
      }
      .fan1 {
        top: 20%;
        transform-origin: 0 150%;
      }
      .c1 {
        top: 20%;
        left: 20%;
        width: 60%;
        height: 60%;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: pointer;
        background: #ffffff00;
      }
      .c1,
      .c2 {
        position: absolute;
        box-sizing: border-box;
      }
      .c2 {
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 10px solid #f7f7f7;
        border-radius: 50%;
      }
      .c3 {
        position: absolute;
        top: 40%;
        left: 40%;
        box-sizing: border-box;
        width: 20%;
        height: 20%;
        border-radius: 50%;
        background: #fff;
        color: #ddd;
        border: 2px solid white;
        line-height: 24px;
      }
      .c3.active {
        border: 2px solid #8dd5c3;
      }
      .c3 span ha-icon {
        width: 100%;
        height: 100%;
      }
      .chevron {
        position: absolute;
        top: 0;
        height: 100%;
        opacity: 0;
      }
      .chevron:hover {
        opacity: 1;
      }
      .chevron.left {
        left: -30px;
        cursor: pointer;
      }
      .chevron.right {
        right: -30px;
        cursor: pointer;
      }
      .chevron span ha-icon {
        width: 30px;
        height: 100%;
      }
      .chevron span ha-icon {
        width: 30px;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .button-angle,
      .button-childlock,
      .button-timer {
        cursor: pointer;
      }

      @keyframes blades {
        0% {
          transform: translate(0, 0) rotate(0);
        }
        to {
          transform: translate(0, 0) rotate(3600deg);
        }
      }
      @keyframes oscillate {
        0% {
          transform: perspective(10em) rotateY(0);
        }
        25% {
          transform: perspective(10em) rotateY(40deg);
        }
        50% {
          transform: perspective(10em) rotateY(0);
        }
        75% {
          transform: perspective(10em) rotateY(-40deg);
        }
        to {
          transform: perspective(10em) rotateY(0);
        }
      }
    `);
    return result;
  }
}
