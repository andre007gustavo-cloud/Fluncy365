export type FeatureFlag = "module_vmw";

export interface FeatureFlagPort {
  isEnabled(flag: FeatureFlag): Promise<boolean>;
}
