import { ComponentManager } from "interactions.ts";

export interface DynamicButtonsCommandType {
  registerDynamicButtons(componentManager: ComponentManager): Promise<void>;
}
