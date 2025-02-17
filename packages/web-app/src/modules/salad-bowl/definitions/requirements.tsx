import type { FeatureManager } from '../../../FeatureManager'
import type { MachineInfo } from '../../machine/models/MachineInfo'

export type RequirementFn = (
  system: MachineInfo,
  preferences: { cpu: boolean; gpu: boolean; cpuOverridden: boolean; gpuOverridden: boolean },
  featureManager: FeatureManager,
) => boolean

/**
 * Creates a requirements function for a CPU.
 * @param ram The required amount of system RAM.
 * @returns The requirements function.
 */
export const hasCpu = (ram: number): RequirementFn => (system, preferences) =>
  preferences.cpu &&
  (preferences.cpuOverridden ||
    (system.memLayout !== undefined &&
      system.memLayout.reduce((amount, memory) => amount + memory.size, 0) >= ram * 1024 * 1024))

/**
 * Creates a requirements function for a GPU.
 * @param framework The required GPU application framework ("cuda", "opencl", or "*" for any).
 * @param vram The required amount of video RAM.
 * @returns The requirements function.
 */
export const hasGpu = (framework: '*' | 'cuda' | 'opencl', vram: number): RequirementFn => (system, preferences) =>
  preferences.gpu &&
  (preferences.gpuOverridden ||
    (system.graphics !== undefined &&
      system.graphics.controllers.some((controller) => {
        const intel = controller.vendor.toLowerCase().includes('intel')
        if (intel) {
          return false
        }

        const nvidia = controller.vendor.toLowerCase().includes('nvidia')
        if (framework === 'cuda' && !nvidia) {
          return false
        }

        if (framework === 'opencl' && nvidia) {
          return false
        }

        const amount = controller.memoryTotal !== undefined ? controller.memoryTotal : controller.vram
        return amount >= vram * 0.9
      })))

/**
 * Creates a requirements function for a feature flag.
 * @param feature The feature name.
 * @returns The requirements function.
 */
export const isEnabled = (feature: string): RequirementFn => (_system, _preferences, featureManager) =>
  featureManager.isEnabled(feature)

/**
 * Creates a requirements function that negates the output of another requirements function
 * unless the GPU compatibility detection is overridden.
 * @param framework The required GPU application framework ("cuda", "opencl", or "*" for any).
 * @param vram The required amount of video RAM.
 * @returns The requirements function.
 */
export const negateGpuRequirement = (framework: '*' | 'cuda' | 'opencl', vram: number): RequirementFn => {
  const hasGpuInternal = hasGpu(framework, vram)
  return (system, preferences, featureManager) =>
    preferences.gpu && (preferences.gpuOverridden || !hasGpuInternal(system, preferences, featureManager))
}

/**
 * Creates a requirements function that negates the output of another requirements function
 * unless the CPU compatibility detection is overridden.
 * @param ram The required amount of system RAM.
 * @returns The requirements function.
 */
export const negateCpuRequirement = (ram: number): RequirementFn => {
  const hasCpuInternal = hasCpu(ram)
  return (system, preferences, featureManager) =>
    preferences.cpu && (preferences.cpuOverridden || !hasCpuInternal(system, preferences, featureManager))
}
