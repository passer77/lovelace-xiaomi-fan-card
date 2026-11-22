import { LovelaceCardConfig } from "custom-card-helpers";

export const platforms = ["default", "xiaomi_miio_fan"] as const;

interface FanXiaomiCustomConfig {
  name: string;
  platform: typeof platforms[number];
  entity: string;
  disable_animation: boolean;
  force_sleep_mode_support: boolean;
  hide_led_button: boolean;
  /** Override model detection (e.g. dmaker.fan.p5). Optional. */
  model: string;
  /** Swing angle entity (select/number). Optional; auto-discovered by name when omitted. */
  angle_entity: string;
  /** Button entity pressed by the LEFT chevron. Optional. */
  turn_left_entity: string;
  /** Button entity pressed by the RIGHT chevron. Optional. */
  turn_right_entity: string;
  turn_left_name: string;
  turn_right_name: string;
}

export interface FanXiaomiCardConfig extends LovelaceCardConfig, FanXiaomiCustomConfig {}

export const defaultConfig: FanXiaomiCustomConfig = {
  name: "",
  platform: platforms[0],
  entity: "",
  disable_animation: false,
  force_sleep_mode_support: false,
  hide_led_button: false,
  model: "",
  angle_entity: "",
  turn_left_entity: "",
  turn_right_entity: "",
  turn_left_name: "左步进",
  turn_right_name: "右步进",
};
